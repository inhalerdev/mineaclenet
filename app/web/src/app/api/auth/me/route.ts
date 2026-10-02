import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      viewer: {
        username: viewer.username,
        followingCount: viewer.followingCount,
        unreadNotifications: viewer.unreadNotifications,
      },
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
