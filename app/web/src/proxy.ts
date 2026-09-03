import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCoreDb } from "@/lib/db";

const SESSION_COOKIE = "mineacle_session";

type SessionRow = RowDataPacket & {
  id: number | string;
};

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function hasValidSession(token?: string) {
  if (!token) {
    return false;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const [rows] = await getCoreDb().execute<SessionRow[]>(
      `SELECT s.id
       FROM mineacle_web_sessions s
       INNER JOIN mineacle_web_accounts a
         ON a.id = s.account_id
       WHERE s.token_hash = ?
         AND s.expires_at > ?
         AND a.disabled = 0
       LIMIT 1`,
      [digest(token), now],
    );

    return rows.length > 0;
  } catch (error) {
    console.error("[mineacle-access] Failed to validate session", error);
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isAuthApi =
    pathname === "/api/auth" || pathname.startsWith("/api/auth/");

  // Login, logout, session checks and Minecraft verification must stay public.
  if (isAuthApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await hasValidSession(token);

  if (isLoginPage) {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (authenticated) {
    return NextResponse.next();
  }

  // Do not leak protected API responses through a browser redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  const requestedPath = `${pathname}${request.nextUrl.search}`;

  if (requestedPath !== "/") {
    loginUrl.searchParams.set("next", requestedPath);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*$).*)"],
};
