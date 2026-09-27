import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/features/auth/session";
import { getOnlineFollowing } from "@/features/social/follows";

export const dynamic = "force-dynamic";

/* Players the logged-in viewer follows who are online now. Only ever
   returns the viewer's own list. */
export async function GET() {
  const viewer = await getCurrentViewer();
  const headers = { "Cache-Control": "no-store, private" };

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401, headers });
  }

  try {
    const online = await getOnlineFollowing(viewer.accountId);
    return NextResponse.json({ online }, { headers });
  } catch (error) {
    console.error("[mineacle-social] Could not load online friends", error);
    return NextResponse.json({ online: [] }, { status: 503, headers });
  }
}
