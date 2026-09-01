import { NextResponse } from "next/server";
import { searchPlayers } from "@/features/players/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();

  if (!/^[A-Za-z0-9_]{2,16}$/.test(query)) {
    return NextResponse.json(
      { players: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const players = await searchPlayers(query, 8);

    return NextResponse.json(
      {
        players: players.map((player) => ({
          uuid: player.uuid,
          username: player.username,
          displayName: player.displayName,
          online: player.online,
          teamName: player.teamName,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { players: [] },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
