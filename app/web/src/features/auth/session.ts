import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import { ensureAuthSchema } from "@/features/auth/schema";
import type { Viewer } from "@/features/auth/types";
import { getCoreDb } from "@/lib/db";

export const SESSION_COOKIE = "mineacle_session";

const SESSION_TOUCH_SECONDS = 300;
const MAX_ACTIVE_SESSIONS = 10;

type ViewerRow = RowDataPacket & {
  session_id: number | string;
  last_seen_at: number | string;
  id: number | string;
  uuid: string;
  account_username: string;
  current_username: string | null;
  following_count: number | string;
  unread_count: number | string;
};

type SessionIdRow = RowDataPacket & {
  id: number | string;
};

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function sessionDays() {
  const value = Number(process.env.MINEACLE_SESSION_DAYS || 30);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 90) : 30;
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

async function pruneSessions(accountId: number) {
  const db = getCoreDb();
  const now = nowSeconds();

  await db.execute(
    `DELETE FROM mineacle_web_sessions
     WHERE expires_at <= ?`,
    [now],
  );

  const [rows] = await db.execute<SessionIdRow[]>(
    `SELECT id
     FROM mineacle_web_sessions
     WHERE account_id = ?
     ORDER BY created_at DESC`,
    [accountId],
  );

  const oldIds = rows
    .slice(MAX_ACTIVE_SESSIONS - 1)
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!oldIds.length) {
    return;
  }

  const placeholders = oldIds.map(() => "?").join(", ");

  await db.execute(
    `DELETE FROM mineacle_web_sessions
     WHERE account_id = ?
       AND id IN (${placeholders})`,
    [accountId, ...oldIds],
  );
}

export async function createSession(accountId: number) {
  await ensureAuthSchema();
  await pruneSessions(accountId);

  const token = randomBytes(32).toString("base64url");
  const now = nowSeconds();
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

    const now = nowSeconds();
    const db = getCoreDb();
    const [rows] = await db.execute<ViewerRow[]>(
      `SELECT
         s.id AS session_id,
         s.last_seen_at,
         a.id,
         a.uuid,
         a.username AS account_username,
         p.username AS current_username,
         (SELECT COUNT(*) FROM mineacle_web_follows f
            WHERE f.follower_account_id = a.id) AS following_count,
         (SELECT COUNT(*) FROM mineacle_web_notifications n
            WHERE n.account_id = a.id AND n.read_at IS NULL) AS unread_count
       FROM mineacle_web_sessions s
       INNER JOIN mineacle_web_accounts a ON a.id = s.account_id
       LEFT JOIN mineacle_web_profiles p ON p.uuid = a.uuid
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

    const accountId = Number(row.id);
    const currentUsername =
      String(row.current_username || "").trim() ||
      String(row.account_username || "").trim();

    if (
      Number(row.last_seen_at || 0) + SESSION_TOUCH_SECONDS <= now
    ) {
      await db.execute(
        `UPDATE mineacle_web_sessions
         SET last_seen_at = ?
         WHERE id = ?`,
        [now, Number(row.session_id)],
      );
    }

    if (
      currentUsername &&
      currentUsername.toLowerCase() !==
        String(row.account_username || "").toLowerCase()
    ) {
      try {
        await db.execute(
          `UPDATE mineacle_web_accounts
           SET username = ?, username_lower = LOWER(?), updated_at = ?
           WHERE id = ?`,
          [currentUsername, currentUsername, now, accountId],
        );
      } catch {
        // UUID remains authoritative if a historic username collides.
      }
    }

    return {
      accountId,
      uuid: String(row.uuid),
      username: currentUsername,
      followingCount: Number(row.following_count || 0),
      unreadNotifications: Number(row.unread_count || 0),
    };
  } catch (error) {
    console.error("[mineacle-auth] Failed to resolve current viewer", error);
    return null;
  }
}

export async function getActiveSessionCount(accountId: number) {
  await ensureAuthSchema();

  const now = nowSeconds();
  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM mineacle_web_sessions
     WHERE account_id = ?
       AND expires_at > ?`,
    [accountId, now],
  );

  return Number(rows[0]?.total || 0);
}

export async function destroyAllSessions(accountId: number) {
  await ensureAuthSchema();

  await getCoreDb().execute(
    `DELETE FROM mineacle_web_sessions
     WHERE account_id = ?`,
    [accountId],
  );
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
