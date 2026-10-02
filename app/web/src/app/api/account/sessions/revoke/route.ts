import { NextResponse } from "next/server";
import {
  cookieOptions,
  destroyAllSessions,
  getCurrentViewer,
  SESSION_COOKIE,
} from "@/features/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401 });
  }

  await destroyAllSessions(viewer.accountId);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptions(),
    maxAge: 0,
  });

  return response;
}
