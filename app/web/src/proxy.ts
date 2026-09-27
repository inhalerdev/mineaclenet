import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/*
 * Runs before every /api request.
 *
 * Blocks requests that change something (log in, follow, change password...)
 * when a browser says they came from another website. This stops other sites
 * from quietly making a visitor's browser act on Mineacle (CSRF), on top of
 * the session cookie's SameSite=Lax setting.
 *
 * Browsers send Sec-Fetch-Site on every request: "same-origin" for our own
 * pages, "cross-site" for other websites. Tools without it (curl, scripts)
 * are let through; they can't use a visitor's cookies anyway.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request: NextRequest) {
  if (
    !SAFE_METHODS.has(request.method) &&
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    return NextResponse.json(
      { error: "Cross-site requests are not allowed" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
