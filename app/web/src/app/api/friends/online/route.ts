import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/features/auth/session";
import { getOnlineFollowing, recordFriendsOnline } from "@/features/social/follows";
import { readJsonBody } from "@/shared/server/user-error";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS = { "Cache-Control": "no-store, private" };

/* Players the logged-in viewer follows who are online now. Only ever
   returns the viewer's own list. */
export async function GET() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401, headers: HEADERS });
  }

  try {
    const online = await getOnlineFollowing(viewer.accountId);
    return NextResponse.json({ online }, { headers: HEADERS });
  } catch (error) {
    console.error("[mineacle-social] Could not load online friends", error);
    return NextResponse.json({ online: [] }, { status: 503, headers: HEADERS });
  }
}

/* The pop-up just showed these friends coming online: save them to the
   viewer's notifications. The server re-checks that each one is followed
   and online, so nothing else can be written this way. */
export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401, headers: HEADERS });
  }

  const body = await readJsonBody(request);
  const uuids = (Array.isArray(body.uuids) ? body.uuids : [])
    .filter((value): value is string => typeof value === "string" && UUID_PATTERN.test(value))
    .slice(0, 10);

  if (!uuids.length) {
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  }

  try {
    await recordFriendsOnline(viewer.accountId, uuids);
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  } catch (error) {
    console.error("[mineacle-social] Could not save friend-online notifications", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: HEADERS });
  }
}
