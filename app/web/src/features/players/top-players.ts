import { getPlayerLeaderboard } from "@/features/players/repository";

/*
 * Top 3 players (by balance) for the header's Search panel.
 *
 * Kept in server memory for 30 seconds, so the homepage and the login /
 * register pages don't ask the database on every single visit. When many
 * visitors arrive at once they share one query. If the database has a
 * hiccup, the last list is shown until it answers again.
 */

export type TopPlayer = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
};

const CACHE_MS = 30_000;

let cached: { at: number; players: TopPlayer[] } | null = null;
let inFlight: Promise<TopPlayer[]> | null = null;

async function loadTopPlayers(): Promise<TopPlayer[]> {
  const leaderboard = await getPlayerLeaderboard("balance", 3);

  return leaderboard.map((player) => ({
    uuid: player.uuid,
    username: player.username,
    displayName: player.displayName,
    online: player.online,
  }));
}

export async function getTopPlayers(): Promise<TopPlayer[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.players;
  }

  if (!inFlight) {
    inFlight = loadTopPlayers()
      .then((players) => {
        cached = { at: Date.now(), players };
        return players;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  try {
    return await inFlight;
  } catch {
    return cached ? cached.players : [];
  }
}
