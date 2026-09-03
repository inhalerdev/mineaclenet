import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_GATE_COOKIE,
  verifyAdminGateToken,
} from "@/features/admin-gate/gate";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin is the only public application route. It contains the separate
  // development gateway and does not create a Mineacle player session.
  if (pathname === "/admin") {
    return NextResponse.next();
  }

  const gateToken = request.cookies.get(ADMIN_GATE_COOKIE)?.value;
  const unlocked = verifyAdminGateToken(gateToken);

  if (unlocked) {
    return NextResponse.next();
  }

  // Protected APIs return 401 instead of leaking/redirecting API responses.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Development gateway authentication required" },
      { status: 401 },
    );
  }

  const adminUrl = new URL("/admin", request.url);
  const requestedPath = `${pathname}${request.nextUrl.search}`;

  if (requestedPath !== "/") {
    adminUrl.searchParams.set("next", requestedPath);
  }

  return NextResponse.redirect(adminUrl);
}

export const config = {
  // Next internals and public files must remain available so /admin can load.
  matcher: ["/((?!_next|.*\\..*$).*)"],
};
