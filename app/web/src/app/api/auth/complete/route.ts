import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import {
  consumeRateLimit,
  requestClientIp,
} from "@/features/auth/rate-limit";
import { ensureAuthSchema } from "@/features/auth/schema";
import {
  cookieOptions,
  createSession,
  SESSION_COOKIE,
} from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

type Challenge = RowDataPacket & {
  uuid: string;
  username: string;
  expires_at: number | string;
  verified_at: number | string | null;
  consumed_at: number | string | null;
};

export const runtime = "nodejs";

const COMPLETE_POLICY = {
  maximum: 8,
  windowSeconds: 600,
  blockSeconds: 900,
};

function challengeReady(challenge: Challenge | undefined, now: number) {
  return Boolean(
    challenge &&
      Number(challenge.verified_at || 0) > 0 &&
      Number(challenge.consumed_at || 0) === 0 &&
      Number(challenge.expires_at) > now,
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    challengeId?: string;
    password?: string;
  };

  const challengeId = body.challengeId || "";
  const password = body.password || "";

  if (!/^[a-f0-9]{32}$/.test(challengeId)) {
    return NextResponse.json(
      { error: "Invalid verification challenge" },
      { status: 400 },
    );
  }

  if (password.length < 10 || password.length > 128) {
    return NextResponse.json(
      { error: "Use a password between 10 and 128 characters" },
      { status: 400 },
    );
  }

  const ip = requestClientIp(request);

  try {
    const rate = await consumeRateLimit(
      "verify-complete",
      `${ip}|${challengeId}`,
      COMPLETE_POLICY,
    );

    if (rate.blocked) {
      return NextResponse.json(
        { error: "Too many attempts. Wait a few minutes and try again" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, rate.retryAfter)),
          },
        },
      );
    }

    await ensureAuthSchema();

    const db = getCoreDb();
    const now = Math.floor(Date.now() / 1000);

    const [preflightRows] = await db.execute<Challenge[]>(
      `SELECT uuid, username, expires_at, verified_at, consumed_at
       FROM mineacle_web_verifications
       WHERE challenge_id = ?
       LIMIT 1`,
      [challengeId],
    );

    if (!challengeReady(preflightRows[0], now)) {
      return NextResponse.json(
        {
          error:
            "Verify this account in Minecraft before creating your password",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const connection = await db.getConnection();
    let accountId = 0;

    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute<Challenge[]>(
        `SELECT uuid, username, expires_at, verified_at, consumed_at
         FROM mineacle_web_verifications
         WHERE challenge_id = ?
         FOR UPDATE`,
        [challengeId],
      );

      const challenge = rows[0];

      if (!challengeReady(challenge, now)) {
        throw new Error(
          "Verify this account in Minecraft before creating your password",
        );
      }

      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT id
         FROM mineacle_web_accounts
         WHERE uuid = ? OR username_lower = LOWER(?)
         LIMIT 1`,
        [challenge.uuid, challenge.username],
      );

      if (existing[0]) {
        throw new Error("An account already exists for this player");
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO mineacle_web_accounts
          (uuid, username, username_lower, password_hash,
           verified_at, created_at, updated_at, last_login_at, disabled)
         VALUES (?, ?, LOWER(?), ?, ?, ?, ?, ?, 0)`,
        [
          challenge.uuid,
          challenge.username,
          challenge.username,
          passwordHash,
          now,
          now,
          now,
          now,
        ],
      );

      accountId = Number(result.insertId);

      await connection.execute(
        `UPDATE mineacle_web_verifications
         SET consumed_at = ?
         WHERE challenge_id = ?`,
        [now, challengeId],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to create account",
        },
        { status: 409 },
      );
    } finally {
      connection.release();
    }

    try {
      const token = await createSession(accountId);
      const response = NextResponse.json({ ok: true });
      response.cookies.set(SESSION_COOKIE, token, cookieOptions());
      return response;
    } catch (error) {
      console.error(
        "[mineacle-auth] Account created but session creation failed",
        error,
      );

      return NextResponse.json(
        {
          ok: true,
          session: false,
          error: "Account created. Log in with your new password",
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("[mineacle-auth] Account completion failed", error);

    return NextResponse.json(
      { error: "Unable to create account right now" },
      { status: 503 },
    );
  }
}
