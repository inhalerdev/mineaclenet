import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import {
  clearRateLimit,
  getRateLimitState,
  recordRateLimitFailure,
  requestClientIp,
} from "@/features/auth/rate-limit";
import {
  cookieOptions,
  createSession,
  destroyAllSessions,
  getCurrentViewer,
  SESSION_COOKIE,
} from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

type AccountRow = RowDataPacket & {
  password_hash: string;
};

const POLICY = {
  maximum: 5,
  windowSeconds: 900,
  blockSeconds: 900,
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  const currentPassword = body.currentPassword || "";
  const newPassword = body.newPassword || "";

  if (
    currentPassword.length < 1 ||
    currentPassword.length > 128 ||
    newPassword.length < 10 ||
    newPassword.length > 128
  ) {
    return NextResponse.json(
      { error: "Use a new password between 10 and 128 characters" },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Choose a different password" },
      { status: 400 },
    );
  }

  const ip = requestClientIp(request);
  const identity = `${viewer.accountId}|${ip}`;

  try {
    const state = await getRateLimitState("password-change", identity);

    if (state.blocked) {
      return NextResponse.json(
        { error: "Too many attempts. Wait a few minutes and try again" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, state.retryAfter)),
          },
        },
      );
    }

    const [rows] = await getCoreDb().execute<AccountRow[]>(
      `SELECT password_hash
       FROM mineacle_web_accounts
       WHERE id = ? AND disabled = 0
       LIMIT 1`,
      [viewer.accountId],
    );

    const account = rows[0];

    if (
      !account ||
      !(await bcrypt.compare(currentPassword, account.password_hash))
    ) {
      const failed = await recordRateLimitFailure(
        "password-change",
        identity,
        POLICY,
      );

      return NextResponse.json(
        {
          error: failed.blocked
            ? "Too many attempts. Wait a few minutes and try again"
            : "Current password is incorrect",
        },
        {
          status: failed.blocked ? 429 : 401,
          headers: failed.blocked
            ? { "Retry-After": String(Math.max(1, failed.retryAfter)) }
            : undefined,
        },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const now = Math.floor(Date.now() / 1000);

    await getCoreDb().execute(
      `UPDATE mineacle_web_accounts
       SET password_hash = ?, updated_at = ?
       WHERE id = ?`,
      [passwordHash, now, viewer.accountId],
    );

    await destroyAllSessions(viewer.accountId);
    await clearRateLimit("password-change", identity);

    const token = await createSession(viewer.accountId);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());

    return response;
  } catch (error) {
    console.error("[mineacle-auth] Password change failed", error);

    return NextResponse.json(
      { error: "Unable to change password right now" },
      { status: 503 },
    );
  }
}
