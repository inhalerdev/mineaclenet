import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
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
  expires_at: number;
  verified_at: number | null;
  consumed_at: number | null;
};

export const runtime = "nodejs";

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

  await ensureAuthSchema();

  const db = getCoreDb();
  const connection = await db.getConnection();
  const now = Math.floor(Date.now() / 1000);

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

    if (
      !challenge ||
      Number(challenge.verified_at || 0) <= 0 ||
      Number(challenge.consumed_at || 0) > 0 ||
      Number(challenge.expires_at) <= now
    ) {
      throw new Error(
        "Verify this account in Minecraft before creating your password",
      );
    }

    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM mineacle_web_accounts
       WHERE uuid = ? OR username_lower = LOWER(?)
       LIMIT 1`,
      [challenge.uuid, challenge.username],
    );

    if (existing[0]) {
      throw new Error("An account already exists for this player");
    }

    const passwordHash = await bcrypt.hash(password, 12);

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

    await connection.execute(
      `UPDATE mineacle_web_verifications
       SET consumed_at = ?
       WHERE challenge_id = ?`,
      [now, challengeId],
    );

    await connection.commit();

    const token = await createSession(Number(result.insertId));
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());

    return response;
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
}
