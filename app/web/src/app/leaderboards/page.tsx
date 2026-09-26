import { LeaderboardsPage } from "@/components/leaderboards/LeaderboardsPage";
import { getCurrentViewer } from "@/features/auth/session";
import { readLeaderboardSort } from "@/features/players/leaderboard";
import { getLeaderboard } from "@/features/players/leaderboard-data";
import { getTopPlayers } from "@/features/players/top-players";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboards | Mineacle",
  description: "The top Mineacle players by balance, K/D, kills and playtime.",
};

export default async function Leaderboards({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sort = readLeaderboardSort((await searchParams).sort);
  const [viewer, topPlayers, players] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
    getLeaderboard(sort),
  ]);

  return (
    <LeaderboardsPage
      viewer={viewer}
      topPlayers={topPlayers}
      sort={sort}
      players={players}
    />
  );
}
