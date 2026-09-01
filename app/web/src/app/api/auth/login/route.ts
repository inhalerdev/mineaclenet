import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import {
  clearRateLimit,
  getRateLimitState,
  recordRateLimitFailure,
  requestClientIp,
} from "@/features/auth/rate-limit";
import { ensureAuthSchema } from "@/features/auth/schema";
import {
  cookieOptions,
  createSession,
  SESSION_COOKIE,
} from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

type Account = RowDataPacket & {
  id: number | string;
  uuid: string;
  account_username: string;
  current_username: string | null;
  password_hash: string;
  disabled: number | string;
};

const PAIR_POLICY = {
  maximum: 6,
  windowSeconds: 900,
  blockSeconds: 900,
};

const IP_POLICY = {
  maximum: 30,
  windowSeconds: 900,
  blockSeconds: 900,
};

export const runtime = "nodejs";

function limited(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many login attempts. Wait a few minutes and try again" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    },
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  const username = (body.username || "").trim();
  const password = body.password || "";

  if (
    !/^[A-Za-z0-9_]{3,16}$/.test(username) ||
    password.length < 1 ||
    password.length > 128
  ) {
    return NextResponse.json(
      { error: "Enter your Minecraft username and password" },
      { status: 400 },
    );
  }

  const ip = requestClientIp(request);
  const pairIdentity = `${ip}|${username.toLowerCase()}`;

  try {
    const pairState = await getRateLimitState("login-pair", pairIdentity);
    const ipState = await getRateLimitState("login-ip", ip);

    if (pairState.blocked || ipState.blocked) {
      return limited(Math.max(pairState.retryAfter, ipState.retryAfter));
    }

    await ensureAuthSchema();

    const [rows] = await getCoreDb().execute<Account[]>(
      `SELECT
         a.id,
         a.uuid,
         a.username AS account_username,
         p.username AS current_username,
         a.password_hash,
         a.disabled
       FROM mineacle_web_accounts a
       LEFT JOIN mineacle_web_profiles p ON p.uuid = a.uuid
       WHERE a.username_lower = LOWER(?)
          OR LOWER(p.username) = LOWER(?)
       ORDER BY
         CASE WHEN LOWER(p.username) = LOWER(?) THEN 0 ELSE 1 END
       LIMIT 1`,
      [username, username, username],
    );

    const account = rows[0];

    if (
      !account ||
      Number(account.disabled) !== 0 ||
      !(await bcrypt.compare(password, account.password_hash))
    ) {
      const pairFailure = await recordRateLimitFailure(
        "login-pair",
        pairIdentity,
        PAIR_POLICY,
      );
      const ipFailure = await recordRateLimitFailure(
        "login-ip",
        ip,
        IP_POLICY,
      );

      if (pairFailure.blocked || ipFailure.blocked) {
        return limited(
          Math.max(pairFailure.retryAfter, ipFailure.retryAfter),
        );
      }

      return NextResponse.json(
        { error: "The username or password is incorrect" },
        { status: 401 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const canonicalUsername =
      String(account.current_username || "").trim() ||
      String(account.account_username || "").trim();

    await getCoreDb().execute(
      `UPDATE mineacle_web_accounts
       SET last_login_at = ?, updated_at = ?
       WHERE id = ?`,
      [now, now, Number(account.id)],
    );

    if (
      canonicalUsername &&
      canonicalUsername.toLowerCase() !==
        String(account.account_username || "").toLowerCase()
    ) {
      try {
        await getCoreDb().execute(
          `UPDATE mineacle_web_accounts
           SET username = ?, username_lower = LOWER(?), updated_at = ?
           WHERE id = ?`,
          [
            canonicalUsername,
            canonicalUsername,
            now,
            Number(account.id),
          ],
        );
      } catch {
        // UUID remains authoritative if a recycled historic username collides.
      }
    }

    await clearRateLimit("login-pair", pairIdentity);

    const token = await createSession(Number(account.id));
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());

    return response;
  } catch (error) {
    console.error("[mineacle-auth] Login failed unexpectedly", error);

    return NextResponse.json(
      { error: "Account database is unavailable" },
      { status: 503 },
    );
  }
}
