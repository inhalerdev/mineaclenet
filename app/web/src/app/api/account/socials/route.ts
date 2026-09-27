import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/features/auth/rate-limit";
import { getCurrentViewer } from "@/features/auth/session";
import { saveSocialLinks } from "@/features/social/social-links";
import {
  SOCIAL_ORDER,
  SOCIAL_PLATFORMS,
  normalizeHandle,
  type SocialPlatform,
} from "@/features/social/social-platforms";
import { readJsonBody, textField } from "@/shared/server/user-error";

export const runtime = "nodejs";

const POLICY = { maximum: 20, windowSeconds: 900, blockSeconds: 900 };

/* Saves the logged-in player's social links (their own account only). */
export async function PUT(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const handles: Partial<Record<SocialPlatform, string>> = {};

  for (const platform of SOCIAL_ORDER) {
    const handle = normalizeHandle(platform, textField(body, platform).slice(0, 200));

    if (handle === null) {
      return NextResponse.json(
        { error: `That ${SOCIAL_PLATFORMS[platform].label} username doesn't look right` },
        { status: 400 },
      );
    }

    handles[platform] = handle;
  }

  try {
    const rate = await consumeRateLimit("social-links", String(viewer.accountId), POLICY);

    if (rate.blocked) {
      return NextResponse.json(
        { error: "Too many changes. Wait a few minutes and try again" },
        { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfter)) } },
      );
    }

    await saveSocialLinks(viewer.accountId, handles);
    return NextResponse.json({ ok: true, handles });
  } catch (error) {
    console.error("[mineacle-social] Could not save social links", error);
    return NextResponse.json({ error: "Unable to save right now" }, { status: 503 });
  }
}
