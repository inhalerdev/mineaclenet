import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getCurrentViewer } from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401 });
  }

  const body = (await request.json()) as { username?: string };
  const username = (body.username || "").trim();

  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    return NextResponse.json(
      { error: "Enter a valid Minecraft username" },
      { status: 400 },
    );
  }

  await ensureAuthSchema();

  const [profiles] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT uuid, username
     FROM mineacle_web_profiles
     WHERE LOWER(username) = LOWER(?)
     LIMIT 1`,
    [username],
  );

  const player = profiles[0];

  if (!player) {
    return NextResponse.json(
      { error: "That player has not joined Mineacle" },
      { status: 404 },
    );
  }

  if (String(player.uuid) === viewer.uuid) {
    return NextResponse.json(
      { error: "You cannot follow yourself" },
      { status: 400 },
    );
  }

  const now = Math.floor(Date.now() / 1000);

  await getCoreDb().execute(
    `INSERT INTO mineacle_web_follows
      (follower_account_id, target_uuid, target_username, created_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE target_username = VALUES(target_username)`,
    [viewer.accountId, player.uuid, player.username, now],
  );

  return NextResponse.json({
    ok: true,
    player: {
      uuid: String(player.uuid),
      username: String(player.username),
    },
  });
}
