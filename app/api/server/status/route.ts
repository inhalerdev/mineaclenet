import { resolveSrv } from "node:dns/promises";
import { createConnection } from "node:net";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getCoreDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_SERVER =
  process.env.MINECRAFT_SERVER_ADDRESS?.trim() ||
  "mineacle.net";

const DEFAULT_PORT = 25565;
const STATUS_PROTOCOL = 767;
const STATUS_TIMEOUT_MS = 800;
const SRV_TIMEOUT_MS = 350;

type ServerTarget = {
  host: string;
  port: number;
};

type DirectStatus = {
  online: true;
  playersOnline: number;
  playersMax: number;
};

function statusNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function parseServerAddress(value: string): ServerTarget {
  const normalized = value
    .replace(/^minecraft:\/\//i, "")
    .trim();

  const match = normalized.match(/^([^:]+):(\d+)$/);

  if (!match) {
    return {
      host: normalized || "mineacle.net",
      port: DEFAULT_PORT,
    };
  }

  const parsedPort = Number(match[2]);

  return {
    host: match[1],
    port:
      Number.isInteger(parsedPort) &&
      parsedPort >= 1 &&
      parsedPort <= 65535
        ? parsedPort
        : DEFAULT_PORT,
  };
}

async function resolveServerTarget(): Promise<ServerTarget> {
  const configured = parseServerAddress(PUBLIC_SERVER);

  // A manually configured port should always win.
  if (configured.port !== DEFAULT_PORT) {
    return configured;
  }

  try {
    const records = await Promise.race([
      resolveSrv(`_minecraft._tcp.${configured.host}`),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("SRV lookup timed out")),
          SRV_TIMEOUT_MS,
        );
      }),
    ]);

    const record = records
      .filter(
        (item) =>
          typeof item.name === "string" &&
          item.name.length > 0 &&
          Number.isInteger(item.port) &&
          item.port >= 1 &&
          item.port <= 65535,
      )
      .sort(
        (left, right) =>
          left.priority - right.priority ||
          right.weight - left.weight,
      )[0];

    if (record) {
      return {
        host: record.name.replace(/\.$/, ""),
        port: record.port,
      };
    }
  } catch {
    // Fall through to the normal Java port.
  }

  return configured;
}

function encodeVarInt(value: number) {
  const bytes: number[] = [];
  let remaining = value >>> 0;

  do {
    let current = remaining & 0x7f;
    remaining >>>= 7;

    if (remaining !== 0) {
      current |= 0x80;
    }

    bytes.push(current);
  } while (remaining !== 0);

  return Buffer.from(bytes);
}

function encodeString(value: string) {
  const data = Buffer.from(value, "utf8");

  return Buffer.concat([
    encodeVarInt(data.length),
    data,
  ]);
}

function readBufferVarInt(
  buffer: Buffer,
  offset: number,
): { value: number; size: number } | null {
  let value = 0;
  let shift = 0;

  for (let index = 0; index < 5; index += 1) {
    const position = offset + index;

    if (position >= buffer.length) {
      return null;
    }

    const current = buffer[position];
    value |= (current & 0x7f) << shift;

    if ((current & 0x80) === 0) {
      return {
        value,
        size: index + 1,
      };
    }

    shift += 7;
  }

  return null;
}

function parseMinecraftStatusPacket(
  buffer: Buffer,
): DirectStatus | null {
  const packetLength = readBufferVarInt(buffer, 0);

  if (!packetLength || packetLength.value <= 0) {
    return null;
  }

  const packetStart = packetLength.size;
  const packetEnd = packetStart + packetLength.value;

  if (buffer.length < packetEnd) {
    return null;
  }

  const packet = buffer.subarray(
    packetStart,
    packetEnd,
  );

  const packetId = readBufferVarInt(packet, 0);

  if (!packetId || packetId.value !== 0) {
    return null;
  }

  const jsonLength = readBufferVarInt(
    packet,
    packetId.size,
  );

  if (!jsonLength || jsonLength.value <= 0) {
    return null;
  }

  const jsonStart =
    packetId.size + jsonLength.size;
  const jsonEnd =
    jsonStart + jsonLength.value;

  if (packet.length < jsonEnd) {
    return null;
  }

  try {
    const data = JSON.parse(
      packet
        .subarray(jsonStart, jsonEnd)
        .toString("utf8"),
    ) as {
      players?: {
        online?: unknown;
        max?: unknown;
      };
    };

    return {
      online: true,
      playersOnline: statusNumber(
        data.players?.online,
      ),
      playersMax: statusNumber(
        data.players?.max,
      ),
    };
  } catch {
    return null;
  }
}

async function directMinecraftStatus(
  target: ServerTarget,
): Promise<DirectStatus | null> {
  return new Promise((resolve) => {
    let settled = false;
    let received = Buffer.alloc(0);

    const socket = createConnection({
      host: target.host,
      port: target.port,
    });

    function finish(
      status: DirectStatus | null,
    ) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(status);
    }

    socket.setTimeout(STATUS_TIMEOUT_MS);

    socket.once("connect", () => {
      const port = Buffer.alloc(2);
      port.writeUInt16BE(target.port, 0);

      const handshake = Buffer.concat([
        encodeVarInt(0),
        encodeVarInt(STATUS_PROTOCOL),
        encodeString(target.host),
        port,
        encodeVarInt(1),
      ]);

      const handshakePacket = Buffer.concat([
        encodeVarInt(handshake.length),
        handshake,
      ]);

      // Status request packet:
      // packet length 1, packet id 0.
      const statusRequest = Buffer.from([
        0x01,
        0x00,
      ]);

      socket.write(
        Buffer.concat([
          handshakePacket,
          statusRequest,
        ]),
      );
    });

    socket.on("data", (chunk) => {
      received = Buffer.concat([
        received,
        chunk,
      ]);

      const status =
        parseMinecraftStatusPacket(received);

      if (status) {
        finish(status);
      }
    });

    socket.once("timeout", () => {
      finish(null);
    });

    socket.once("error", () => {
      finish(null);
    });

    socket.once("close", () => {
      finish(null);
    });
  });
}

async function webProfilesOnlineCount() {
  try {
    const [rows] =
      await getCoreDb().query<RowDataPacket[]>(
        `SELECT COUNT(*) AS players_online
         FROM \`mineacle_web_profiles\`
         WHERE \`online\` = 1`,
      );

    return {
      available: true,
      count: statusNumber(
        rows[0]?.players_online,
      ),
    };
  } catch {
    return {
      available: false,
      count: 0,
    };
  }
}

export async function GET() {
  const [target, profiles] =
    await Promise.all([
      resolveServerTarget(),
      webProfilesOnlineCount(),
    ]);

  const direct =
    await directMinecraftStatus(target);

  const online =
    direct?.online === true ||
    (!direct && profiles.available && profiles.count > 0);

  const currentlyPlaying =
    profiles.available
      ? profiles.count
      : direct?.playersOnline ?? 0;

  const playersMax =
    direct?.playersMax ?? 0;

  const source = direct
    ? profiles.available
      ? "direct+web_profiles"
      : "direct"
    : profiles.available
      ? "web_profiles"
      : "unavailable";

  return NextResponse.json(
    {
      // Current Next.js homepage contract.
      online,
      currentlyPlaying,
      maxPlayers: playersMax,
      checked: true,
      source,

      // Old working endpoint contract retained for compatibility/debugging.
      players_online: currentlyPlaying,
      players_max: playersMax,
      server_ip: PUBLIC_SERVER,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
