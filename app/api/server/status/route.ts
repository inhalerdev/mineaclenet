import { resolveSrv } from "node:dns/promises";
import { createConnection } from "node:net";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getCoreDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_HOST = "mineacle.net";
const DEFAULT_PORT = 25565;
const CONNECT_TIMEOUT_MS = 1400;

type Target = {
  host: string;
  port: number;
};

async function resolveMinecraftTarget(): Promise<Target> {
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
          ? configuredPort
          : DEFAULT_PORT,
    };
  }

  try {
    const records = await resolveSrv(
      `_minecraft._tcp.${DEFAULT_HOST}`,
    );

    const target = records
      .filter(
        (record) =>
          record.name &&
          Number.isFinite(record.port) &&
          record.port > 0,
      )
      .sort(
        (left, right) =>
          left.priority - right.priority ||
          right.weight - left.weight,
      )[0];

    if (target) {
      return {
        host: target.name.replace(/\.$/, ""),
        port: target.port,
      };
    }
  } catch {
    // No SRV record. Use the normal Java default.
  }

  return {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
  };
}

function canReachMinecraft({
  host,
  port,
}: Target): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const socket = createConnection({
      host,
      port,
    });

    function finish(value: boolean) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(value);
    }

    socket.setTimeout(CONNECT_TIMEOUT_MS);

    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function getCurrentlyPlaying() {
  try {
    const [columns] =
      await getCoreDb().query<RowDataPacket[]>(
        "SHOW COLUMNS FROM `mineacle_web_profiles` LIKE 'online'",
      );

    if (!columns.length) {
      return 0;
    }

    const [rows] =
      await getCoreDb().query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM \`mineacle_web_profiles\`
         WHERE \`online\` > 0`,
      );

    const value = Number(rows[0]?.total || 0);

    return Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const [target, currentlyPlaying] =
    await Promise.all([
      resolveMinecraftTarget(),
      getCurrentlyPlaying(),
    ]);

  const reachable = await canReachMinecraft(target);

  return NextResponse.json(
    {
      online: reachable || currentlyPlaying > 0,
      currentlyPlaying,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
