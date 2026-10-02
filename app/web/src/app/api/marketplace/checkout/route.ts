import { NextResponse } from "next/server";
import {
  getRateLimitState,
  recordRateLimitFailure,
  requestClientIp,
} from "@/features/auth/rate-limit";
import { getCurrentViewer } from "@/features/auth/session";
import {
  type CartLine,
  createCheckout,
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
} from "@/features/marketplace/tebex";
import {
  publicMessage,
  readJsonBody,
  UserFacingError,
} from "@/shared/server/user-error";

export const runtime = "nodejs";

/* Each Buy click creates a Tebex basket; 15 per 5 minutes is plenty. */
const CHECKOUT_LIMIT = { maximum: 15, windowSeconds: 300, blockSeconds: 300 };

/*
 * POST { items: [{ packageId, quantity }] } → { ident } for Tebex.js. The
 * basket is always for the logged-in player's own Minecraft account.
 */
function readLines(body: Record<string, unknown>): CartLine[] | null {
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_CART_LINES) {
    return null;
  }

  const lines = new Map<number, number>();

  for (const item of body.items) {
    const packageId = Number((item as Record<string, unknown>)?.packageId);
    const quantity = Number((item as Record<string, unknown>)?.quantity ?? 1);

    if (!Number.isSafeInteger(packageId) || packageId <= 0
        || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      return null;
    }

    lines.set(packageId, Math.min(MAX_LINE_QUANTITY, (lines.get(packageId) ?? 0) + quantity));
  }

  return [...lines].map(([packageId, quantity]) => ({ packageId, quantity }));
}

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in to buy" }, { status: 401 });
  }

  const lines = readLines(await readJsonBody(request));

  if (!lines) {
    return NextResponse.json({ error: "Your cart couldn't be read. Refresh and try again." }, { status: 400 });
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
      lines,
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
