import { NextResponse } from "next/server";
import {
  getRateLimitState,
  recordRateLimitFailure,
  requestClientIp,
} from "@/features/auth/rate-limit";
import { getCurrentViewer } from "@/features/auth/session";
import { createCheckout } from "@/features/marketplace/tebex";
import {
  publicMessage,
  readJsonBody,
  UserFacingError,
} from "@/shared/server/user-error";

export const runtime = "nodejs";

/* Each Buy click creates a Tebex basket; 15 per 5 minutes is plenty. */
const CHECKOUT_LIMIT = { maximum: 15, windowSeconds: 300, blockSeconds: 300 };

/*
 * POST { packageId } → { ident } for Tebex.js. The basket is always for the
 * logged-in player's own Minecraft account.
 */
export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in to buy" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const packageId = Number(body.packageId);

  if (!Number.isSafeInteger(packageId) || packageId <= 0) {
    return NextResponse.json({ error: "Choose an item" }, { status: 400 });
  }

  const identity = `account:${viewer.accountId}`;

  try {
    const limit = await getRateLimitState("marketplace-checkout", identity);

    if (limit.blocked) {
      return NextResponse.json(
        { error: "Too many checkouts. Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

    await recordRateLimitFailure("marketplace-checkout", identity, CHECKOUT_LIMIT);

    const ident = await createCheckout({
      username: viewer.username,
      uuid: viewer.uuid,
      packageId,
      ipAddress: requestClientIp(request),
    });

    return NextResponse.json(
      { ident },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    if (!(error instanceof UserFacingError)) {
      console.error("[mineacle-marketplace] Checkout failed", error);
    }

    return NextResponse.json(
      { error: publicMessage(error, "Checkout is unavailable right now. Try again soon.") },
      { status: error instanceof UserFacingError ? 400 : 503 },
    );
  }
}
