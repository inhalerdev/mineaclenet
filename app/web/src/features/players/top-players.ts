import { getPlayerLeaderboard } from "@/features/players/repository";
import { memoryCache } from "@/shared/server/memory-cache";

/*
 * Top 3 players by balance: shown in the header's Search panel, and the
 * richest one in the homepage ticker. Kept in memory for 30 seconds.
 */

export type TopPlayer = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
  /** Balance as shown in game, e.g. "$54,210.00". */
  balance: string;
};

export const getTopPlayers = memoryCache<TopPlayer[]>(
  30_000,
  async () => {
    const leaderboard = await getPlayerLeaderboard("balance", 3);

    return leaderboard.map((player) => ({
      uuid: player.uuid,
      username: player.username,
      displayName: player.displayName,
      online: player.online,
      balance: player.balanceFormatted,
    }));
  },
  [],
);
