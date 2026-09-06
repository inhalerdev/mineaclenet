import { resolveSrv } from "node:dns/promises";
import { createConnection } from "node:net";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getCoreDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_SERVER = "mineacle.net";
const DEFAULT_PORT = 25565;
const STATUS_TIMEOUT_MS = 850;
const EXTERNAL_TIMEOUT_MS = 1_250;
const STATUS_PROTOCOL = 767;

type Target = {
  host: string;
  port: number;
};

type MinecraftStatus = {
  online: boolean;
  playersOnline: number;
  playersMax: number;
  source: string;
};

function safeCount(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : 0;
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
  const content = Buffer.from(value, "utf8");

  return Buffer.concat([
    encodeVarInt(content.length),
    content,
  ]);
}

function readVarInt(
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

async function resolveTarget(): Promise<Target> {
  const configuredHost =
    process.env.MINECRAFT_SERVER_HOST?.trim();

  const configuredPort = Number(
    process.env.MINECRAFT_SERVER_PORT || 0,
  );

  if (configuredHost) {
    return {
      host: configuredHost,
      port:
        Number.isFinite(configuredPort) &&
        configuredPort > 0
          ? Math.min(
              65_535,
              Math.floor(configuredPort),
            )
          : DEFAULT_PORT,
    };
  }

  try {
    const records = await Promise.race([
      resolveSrv(
        `_minecraft._tcp.${PUBLIC_SERVER}`,
      ),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("SRV timeout")),
          350,
        );
      }),
    ]);

    const record = records
      .filter(
        (item) =>
          item.name &&
          Number.isFinite(item.port) &&
          item.port > 0,
      )
      .sort(
        (left, right) =>
          left.priority - right.priority ||
          right.weight - left.weight,
      )[0];

    if (record) {
      return {
        host: record.name.replace(/\.$/, ""),
        port: Math.min(
          65_535,
          Math.floor(record.port),
        ),
      };
    }
  } catch {
    // No usable SRV record. Java's default port is valid.
  }

  return {
    host: PUBLIC_SERVER,
    port: DEFAULT_PORT,
  };
}

function directMinecraftStatus({
  host,
  port,
}: Target): Promise<MinecraftStatus | null> {
  return new Promise((resolve) => {
    let settled = false;
    let received = Buffer.alloc(0);

    const socket = createConnection({
      host,
      port,
    });

    function finish(
      value: MinecraftStatus | null,
    ) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(value);
    }

    socket.setTimeout(STATUS_TIMEOUT_MS);

    socket.once("connect", () => {
      const portBuffer = Buffer.alloc(2);
      portBuffer.writeUInt16BE(port, 0);

      const handshake = Buffer.concat([
        encodeVarInt(0),
        encodeVarInt(STATUS_PROTOCOL),
        encodeString(host),
        portBuffer,
        encodeVarInt(1),
      ]);

      socket.write(
        Buffer.concat([
          encodeVarInt(handshake.length),
          handshake,
          Buffer.from([0x01, 0x00]),
        ]),
      );
    });

    socket.on("data", (chunk) => {
      received = Buffer.concat([
        received,
        chunk,
      ]);

      const packetLength = readVarInt(
        received,
        0,
      );

      if (!packetLength) {
        return;
      }

      const packetStart = packetLength.size;
      const packetEnd =
        packetStart + packetLength.value;

      if (received.length < packetEnd) {
        return;
      }

      const packet = received.subarray(
        packetStart,
        packetEnd,
      );

      const packetId = readVarInt(
        packet,
        0,
      );

      if (
        !packetId ||
        packetId.value !== 0
      ) {
        finish(null);
        return;
      }

      const jsonLength = readVarInt(
        packet,
        packetId.size,
      );

      if (!jsonLength) {
        return;
      }

      const jsonStart =
        packetId.size + jsonLength.size;
      const jsonEnd =
        jsonStart + jsonLength.value;

      if (packet.length < jsonEnd) {
        return;
      }

      try {
        const payload = JSON.parse(
          packet
            .subarray(jsonStart, jsonEnd)
            .toString("utf8"),
        ) as {
          players?: {
            online?: unknown;
            max?: unknown;
          };
        };

        finish({
          online: true,
          playersOnline: safeCount(
            payload.players?.online,
          ),
          playersMax: safeCount(
            payload.players?.max,
          ),
          source: "direct",
        });
      } catch {
        finish(null);
      }
    });

    socket.once(
      "timeout",
      () => finish(null),
    );
    socket.once(
      "error",
      () => finish(null),
    );
    socket.once(
      "close",
      () => finish(null),
    );
  });
}

async function profileOnlineCount() {
  try {
    const [rows] =
      await getCoreDb().query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM \`mineacle_web_profiles\`
         WHERE \`online\` = 1`,
      );

    return {
      available: true,
      count: safeCount(rows[0]?.total),
    };
  } catch {
    return {
      available: false,
      count: 0,
    };
  }
}

async function fetchJson(
  url: string,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    return response.ok
      ? ((await response.json()) as Record<
          string,
          unknown
        >)
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeExternal(
  payload: Record<string, unknown> | null,
  source: string,
): MinecraftStatus | null {
  if (!payload) {
    return null;
  }

  const players =
    payload.players &&
    typeof payload.players === "object"
      ? (payload.players as Record<
          string,
          unknown
        >)
      : {};

  return {
    online: payload.online === true,
    playersOnline: safeCount(
      players.online ??
        payload.players_online ??
        payload.online_players,
    ),
    playersMax: safeCount(
      players.max ??
        payload.players_max ??
        payload.max_players,
    ),
    source,
  };
}

async function externalStatus() {
  const encoded =
    encodeURIComponent(PUBLIC_SERVER);

  const [mcsrv, mcstatus] =
    await Promise.all([
      fetchJson(
        `https://api.mcsrvstat.us/3/${encoded}`,
        EXTERNAL_TIMEOUT_MS,
      ),
      fetchJson(
        `https://api.mcstatus.io/v2/status/java/${encoded}`,
        EXTERNAL_TIMEOUT_MS,
      ),
    ]);

  const statuses = [
    normalizeExternal(mcsrv, "mcsrvstat"),
    normalizeExternal(mcstatus, "mcstatus"),
  ].filter(
    (
      status,
    ): status is MinecraftStatus =>
      status !== null,
  );

  return (
    statuses.find(
      (status) => status.online,
    ) ??
    statuses[0] ??
    null
  );
}

export async function GET() {
  const [target, profiles] =
    await Promise.all([
      resolveTarget(),
      profileOnlineCount(),
    ]);

  const direct =
    await directMinecraftStatus(target);

  let status = direct;

  if (!status) {
    status = await externalStatus();
  }

  if (!status) {
    return NextResponse.json(
      {
        online: false,
        currentlyPlaying:
          profiles.count,
        maxPlayers: 0,
        checked: false,
        source: profiles.available
          ? "web_profiles"
          : "unavailable",
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0, must-revalidate",
        },
      },
    );
  }

  return NextResponse.json(
    {
      online: status.online,
      currentlyPlaying:
        profiles.available
          ? profiles.count
          : status.playersOnline,
      maxPlayers: status.playersMax,
      checked: true,
      source: profiles.available
        ? `${status.source}+web_profiles`
        : status.source,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
