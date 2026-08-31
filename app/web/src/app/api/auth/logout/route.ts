import { NextResponse } from "next/server";
import {
  cookieOptions,
  destroyCurrentSession,
  SESSION_COOKIE,
} from "@/features/auth/session";

export async function POST() {
  await destroyCurrentSession();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptions(),
    maxAge: 0,
  });

  return response;
}
