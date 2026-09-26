import { memoryCache } from "@/shared/server/memory-cache";
import { LEADERBOARD_SIZE, leaderboardSorts } from "./leaderboard";
import { getPlayerLeaderboard } from "./repository";
import type { LeaderboardSort, PlayerProfile } from "./types";

/*
 * Loads a leaderboard with a 30-second in-memory cache per ranking, so busy
 * traffic doesn't hit the database on every visit.
 */

/* One cached loader per ranking. null means the database couldn't be
   reached and nothing has loaded yet. */
const loaders = Object.fromEntries(
  leaderboardSorts.map(({ key }) => [
    key,
    memoryCache<PlayerProfile[] | null>(
      30_000,
      () => getPlayerLeaderboard(key, LEADERBOARD_SIZE),
      null,
    ),
  ]),
) as Record<LeaderboardSort, () => Promise<PlayerProfile[] | null>>;

export function getLeaderboard(sort: LeaderboardSort) {
  return loaders[sort]();
}
