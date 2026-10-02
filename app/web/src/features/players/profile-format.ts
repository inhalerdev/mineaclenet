import type { PlayerProfile } from "./types";

/*
 * Display helpers for the public player profile (/player/<name>).
 */

/* Times from the plugin may be in seconds or milliseconds. */
function toMs(epoch: number) {
  if (!Number.isFinite(epoch) || epoch <= 0) return 0;
  return epoch < 100_000_000_000 ? epoch * 1000 : epoch;
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Chicago",
});

export function profileDate(epoch: number) {
  const ms = toMs(epoch);
  return ms ? dateFormat.format(new Date(ms)) : "Unknown";
}

/* "just now", "5 minutes ago", "3 days ago"... */
export function timeAgo(epoch: number, now = Date.now()) {
  const ms = toMs(epoch);
  if (!ms) return "Unknown";

  const seconds = Math.max(0, Math.round((now - ms) / 1000));
  const steps: Array<[number, string]> = [
    [60 * 60 * 24 * 365, "year"],
    [60 * 60 * 24 * 30, "month"],
    [60 * 60 * 24 * 7, "week"],
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ];

  for (const [size, unit] of steps) {
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}

export function playtimeLabel(player: PlayerProfile) {
  return player.playtimeFormatted || `${Math.floor(player.playtimeSeconds / 3600)}h`;
}

/* The rank color from the plugin, only if it's a plain #rrggbb color. */
export function rankColor(player: PlayerProfile) {
  return /^#[0-9a-f]{6}$/i.test(player.rankColor) ? player.rankColor : null;
}
