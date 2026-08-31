import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import { ensureAuthSchema } from "@/features/auth/schema";
import type { Viewer } from "@/features/auth/types";
import { getCoreDb } from "@/lib/db";

export const SESSION_COOKIE = "mineacle_session";

type ViewerRow = RowDataPacket & {
  id: number;
  uuid: string;
  username: string;
  following_count: number | string;
  unread_count: number | string;
};

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionDays() {
  const value = Number(process.env.MINEACLE_SESSION_DAYS || 30);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionDays() * 86400,
  };
}

export async function createSession(accountId: number) {
  await ensureAuthSchema();

  const token = randomBytes(32).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + sessionDays() * 86400;

  await getCoreDb().execute(
    `INSERT INTO mineacle_web_sessions
      (account_id, token_hash, created_at, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?)`,
    [accountId, digest(token), now, expiresAt, now],
  );

  return token;
}

export async function getCurrentViewer(): Promise<Viewer | null> {
  try {
    await ensureAuthSchema();

    const token = (await cookies()).get(SESSION_COOKIE)?.value;

    if (!token) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const [rows] = await getCoreDb().execute<ViewerRow[]>(
      `SELECT
         a.id,
         a.uuid,
         a.username,
         (SELECT COUNT(*) FROM mineacle_web_follows f
            WHERE f.follower_account_id = a.id) AS following_count,
         (SELECT COUNT(*) FROM mineacle_web_notifications n
            WHERE n.account_id = a.id AND n.read_at IS NULL) AS unread_count
       FROM mineacle_web_sessions s
       INNER JOIN mineacle_web_accounts a ON a.id = s.account_id
       WHERE s.token_hash = ?
         AND s.expires_at > ?
         AND a.disabled = 0
       LIMIT 1`,
      [digest(token), now],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      accountId: Number(row.id),
      uuid: row.uuid,
      username: row.username,
      followingCount: Number(row.following_count),
      unreadNotifications: Number(row.unread_count),
    };
  } catch (error) {
    console.error("[mineacle-auth] Failed to resolve current viewer", error);
    return null;
  }
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return;
  }

  try {
    await ensureAuthSchema();
    await getCoreDb().execute(
      "DELETE FROM mineacle_web_sessions WHERE token_hash = ?",
      [digest(token)],
    );
  } catch (error) {
    console.error("[mineacle-auth] Failed to destroy session row", error);
  }
}
