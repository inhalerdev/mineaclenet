import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_GATE_COOKIE,
  verifyAdminGateToken,
} from "@/features/admin-gate/gate";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The development gateway itself and public server-status projection must
  // remain reachable without an admin-gate cookie.
  //
  // /api/server/status only returns public Minecraft availability/count data.
  // Keeping it outside the development gate also matches the old working
  // Mineacle status endpoint behavior.
  if (
    pathname === "/admin" ||
    pathname === "/api/server/status"
  ) {
    return NextResponse.next();
  }

  const gateToken =
    request.cookies.get(ADMIN_GATE_COOKIE)?.value;
  const unlocked = verifyAdminGateToken(gateToken);

  if (unlocked) {
    return NextResponse.next();
  }

  // All other application APIs remain hidden behind the development gateway.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error:
          "Development gateway authentication required",
      },
      { status: 401 },
    );
  }

  const adminUrl = new URL(
    "/admin",
    request.url,
  );
  const requestedPath = `${pathname}${request.nextUrl.search}`;

  if (requestedPath !== "/") {
    adminUrl.searchParams.set(
      "next",
      requestedPath,
    );
  }

  return NextResponse.redirect(adminUrl);
}

export const config = {
  // Next internals and public files must remain available so /admin can load.
  matcher: ["/((?!_next|.*\\..*$).*)"],
};
