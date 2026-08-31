import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { ensureAuthSchema } from "@/features/auth/schema";
import {
  cookieOptions,
  createSession,
  SESSION_COOKIE,
} from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

type Account = RowDataPacket & {
  id: number;
  username: string;
  password_hash: string;
  disabled: number;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  const username = (body.username || "").trim();
  const password = body.password || "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Enter your Minecraft username and password" },
      { status: 400 },
    );
  }

  try {
    await ensureAuthSchema();

    const [rows] = await getCoreDb().execute<Account[]>(
      `SELECT id, username, password_hash, disabled
       FROM mineacle_web_accounts
       WHERE username_lower = LOWER(?)
       LIMIT 1`,
      [username],
    );

    const account = rows[0];

    if (
      !account ||
      Number(account.disabled) !== 0 ||
      !(await bcrypt.compare(password, account.password_hash))
    ) {
      return NextResponse.json(
        { error: "The username or password is incorrect" },
        { status: 401 },
      );
    }

    const now = Math.floor(Date.now() / 1000);

    await getCoreDb().execute(
      `UPDATE mineacle_web_accounts
       SET last_login_at = ?, updated_at = ?
       WHERE id = ?`,
      [now, now, account.id],
    );

    const token = await createSession(Number(account.id));
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());

    return response;
  } catch {
    return NextResponse.json(
      { error: "Account database is unavailable" },
      { status: 503 },
    );
  }
}
