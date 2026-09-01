import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getCoreDb } from "@/lib/db";

type LimitRow = RowDataPacket & {
  attempts: number | string;
  window_started_at: number | string;
  blocked_until: number | string;
};

export type RateLimitPolicy = {
  maximum: number;
  windowSeconds: number;
  blockSeconds: number;
};

export type RateLimitState = {
  blocked: boolean;
  retryAfter: number;
};

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function bucket(action: string, identity: string) {
  return createHash("sha256")
    .update(`${action.trim().toLowerCase()}|${identity.trim().toLowerCase()}`)
    .digest("hex");
}

export function requestClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const value = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return value.slice(0, 64);
}

export async function getRateLimitState(
  action: string,
  identity: string,
): Promise<RateLimitState> {
  await ensureAuthSchema();

  const now = nowSeconds();
  const [rows] = await getCoreDb().execute<LimitRow[]>(
    `SELECT blocked_until
     FROM mineacle_web_auth_limits
     WHERE bucket_hash = ?
     LIMIT 1`,
    [bucket(action, identity)],
  );

  const blockedUntil = Number(rows[0]?.blocked_until || 0);

  return {
    blocked: blockedUntil > now,
    retryAfter: Math.max(0, blockedUntil - now),
  };
}

export async function recordRateLimitFailure(
  action: string,
  identity: string,
  policy: RateLimitPolicy,
) {
  await ensureAuthSchema();

  const db = getCoreDb();
  const connection = await db.getConnection();
  const key = bucket(action, identity);
  const now = nowSeconds();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<LimitRow[]>(
      `SELECT attempts, window_started_at, blocked_until
       FROM mineacle_web_auth_limits
       WHERE bucket_hash = ?
       FOR UPDATE`,
      [key],
    );

    const row = rows[0];
    let attempts = Number(row?.attempts || 0);
    let windowStartedAt = Number(row?.window_started_at || now);
    let blockedUntil = Number(row?.blocked_until || 0);

    if (!row || windowStartedAt + policy.windowSeconds <= now) {
      attempts = 0;
      windowStartedAt = now;
      blockedUntil = 0;
    }

    attempts += 1;

    if (attempts > policy.maximum) {
      blockedUntil = Math.max(blockedUntil, now + policy.blockSeconds);
    }

    await connection.execute(
      `INSERT INTO mineacle_web_auth_limits
        (bucket_hash, attempts, window_started_at, blocked_until, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         attempts = VALUES(attempts),
         window_started_at = VALUES(window_started_at),
         blocked_until = VALUES(blocked_until),
         updated_at = VALUES(updated_at)`,
      [key, attempts, windowStartedAt, blockedUntil, now],
    );

    await connection.commit();

    return {
      blocked: blockedUntil > now,
      retryAfter: Math.max(0, blockedUntil - now),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function consumeRateLimit(
  action: string,
  identity: string,
  policy: RateLimitPolicy,
): Promise<RateLimitState> {
  const state = await getRateLimitState(action, identity);

  if (state.blocked) {
    return state;
  }

  return recordRateLimitFailure(action, identity, policy);
}

export async function clearRateLimit(action: string, identity: string) {
  await ensureAuthSchema();

  await getCoreDb().execute(
    `DELETE FROM mineacle_web_auth_limits
     WHERE bucket_hash = ?`,
    [bucket(action, identity)],
  );
}
