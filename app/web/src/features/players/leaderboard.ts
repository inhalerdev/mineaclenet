import type { LeaderboardSort, PlayerProfile } from "./types";

/*
 * Leaderboards page: the four rankings and how each value is shown.
 * Loading (with a cache) is in leaderboard-data.ts.
 */
export const leaderboardSorts: Array<{ key: LeaderboardSort; label: string }> = [
  { key: "balance", label: "Balance" },
  { key: "kd", label: "K/D" },
  { key: "kills", label: "Kills" },
  { key: "playtime", label: "Playtime" },
];

export const LEADERBOARD_SIZE = 50;

/* The ?sort= value from the URL, or Balance for anything else. */
export function readLeaderboardSort(value: string | string[] | undefined): LeaderboardSort {
  const text = Array.isArray(value) ? value[0] : value;
  return leaderboardSorts.find((item) => item.key === text)?.key ?? "balance";
}

/* A player's value for one ranking, as shown on the page. */
export function leaderboardValue(sort: LeaderboardSort, player: PlayerProfile) {
  switch (sort) {
    case "kd":
      return player.kdRatio.toFixed(2);
    case "kills":
      return player.kills.toLocaleString("en-US");
    case "playtime":
      return player.playtimeFormatted || `${Math.floor(player.playtimeSeconds / 3600)}h`;
    default:
      return player.balanceFormatted;
  }
}
