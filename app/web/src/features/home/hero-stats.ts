import { countPlayersJoined } from "@/features/players/repository";
import { memoryCache } from "@/shared/server/memory-cache";

/*
 * Numbers for the homepage hero's stat tiles that come from the database.
 * Kept in memory for 60 seconds. null = the database couldn't be reached
 * (that tile is then left out).
 */
export type HeroStats = {
  playersJoined: number;
};

export const getHeroStats = memoryCache<HeroStats | null>(
  60_000,
  async () => ({ playersJoined: await countPlayersJoined() }),
  null,
);
