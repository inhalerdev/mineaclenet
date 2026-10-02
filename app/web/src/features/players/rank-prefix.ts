/*
 * Rank prefixes shown before player names on the website, matching the
 * in-game ones. The key is the player's LuckPerms primary group, which the
 * server saves as rank_key in mineacle_web_profiles.
 *
 *   plus       purple "+"            (touching the name)
 *   media      purple camera icon    (touching the name)
 *   builder    orange BUILDER label  (then a space)
 *   admin      red ADMIN label       (then a space)
 *   developer  green DEV label       (then a space)
 *   default / anything else: no prefix
 *
 * Group names match the ones MineacleCore's warps.yml recognises. To add a
 * rank, add its LuckPerms group name here.
 */
export type RankPrefix =
  | { kind: "symbol"; text: string; color: string; label: string }
  | { kind: "tag"; text: string; color: string; label: string }
  | { kind: "camera"; color: string; label: string };

const PREFIXES: Record<string, RankPrefix> = {
  plus: { kind: "symbol", text: "+", color: "#b078ff", label: "Plus" },
  media: { kind: "camera", color: "#b078ff", label: "Media" },
  "media-plus": { kind: "camera", color: "#b078ff", label: "Media" },
  mediaplus: { kind: "camera", color: "#b078ff", label: "Media" },
  media_plus: { kind: "camera", color: "#b078ff", label: "Media" },
  "media+": { kind: "camera", color: "#b078ff", label: "Media" },
  builder: { kind: "tag", text: "BUILDER", color: "#ffaa00", label: "Builder" },
  admin: { kind: "tag", text: "ADMIN", color: "#fc1111", label: "Admin" },
  administrator: { kind: "tag", text: "ADMIN", color: "#fc1111", label: "Admin" },
  developer: { kind: "tag", text: "DEV", color: "#11fc7b", label: "Developer" },
  dev: { kind: "tag", text: "DEV", color: "#11fc7b", label: "Developer" },
};

export function rankPrefix(rankKey: string | null | undefined): RankPrefix | null {
  return PREFIXES[String(rankKey || "").trim().toLowerCase()] ?? null;
}
