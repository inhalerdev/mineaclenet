import { getServerTotals, type ServerTotals } from "@/features/players/repository";
import { memoryCache } from "@/shared/server/memory-cache";

/*
 * Live numbers for the homepage ticker: players joined, money in
 * circulation, PvP kills. Kept in memory for 60 seconds.
 * null = the database couldn't be reached (the ticker then only shows the
 * IP and the online count).
 */
export type LaunchStats = ServerTotals;

export const getLaunchStats = memoryCache<LaunchStats | null>(
  60_000,
  getServerTotals,
  null,
);
