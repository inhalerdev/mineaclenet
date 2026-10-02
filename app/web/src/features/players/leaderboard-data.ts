import { memoryCache } from "@/shared/server/memory-cache";
import { LEADERBOARD_SIZE, leaderboardSorts } from "./leaderboard";
import { getPlayerLeaderboard } from "./repository";
import type { LeaderboardSort, PlayerProfile } from "./types";
import { getVerifiedUuids } from "./verified";

/*
 * Loads a leaderboard with a 30-second in-memory cache per ranking, so busy
 * traffic doesn't hit the database on every visit.
 */
export type LeaderboardData = {
  players: PlayerProfile[];
  /* Lower-case UUIDs of players with a linked website account. */
  verified: string[];
};

async function loadLeaderboard(sort: LeaderboardSort): Promise<LeaderboardData> {
  const players = await getPlayerLeaderboard(sort, LEADERBOARD_SIZE);
  const verified = await getVerifiedUuids(players.map((player) => player.uuid));

  return { players, verified: [...verified] };
}

/* One cached loader per ranking. null means the database couldn't be
   reached and nothing has loaded yet. */
const loaders = Object.fromEntries(
  leaderboardSorts.map(({ key }) => [
    key,
    memoryCache<LeaderboardData | null>(30_000, () => loadLeaderboard(key), null),
  ]),
) as Record<LeaderboardSort, () => Promise<LeaderboardData | null>>;

export function getLeaderboard(sort: LeaderboardSort) {
  return loaders[sort]();
}
