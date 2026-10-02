import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/features/auth/session";
import { getVoteStatus } from "@/features/vote/vote-status";

export const dynamic = "force-dynamic";

/* The logged-in player's recent votes, for the vote page to refresh itself
   after they click "Vote now". Only ever returns the viewer's own votes. */
export async function GET() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json(
      { error: "Log in required" },
      { status: 401, headers: { "Cache-Control": "no-store, private" } },
    );
  }

  const votes = await getVoteStatus(viewer);

  return NextResponse.json(
    { votes: votes ?? {} },
    {
      status: votes ? 200 : 503,
      headers: { "Cache-Control": "no-store, private" },
    },
  );
}
