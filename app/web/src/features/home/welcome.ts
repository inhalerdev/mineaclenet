import type { Viewer } from "@/features/auth/types";
import { getPlayerByUuid } from "@/features/players/repository";
import { getOnlineFollowing } from "@/features/social/follows";
import { getVoteStatus } from "@/features/vote/vote-status";
import { voteSites } from "@/features/vote/vote-sites";

/*
 * What the homepage hero shows a logged-in player: their name, where they
 * stand on the balance leaderboard, how many votes they have left today and
 * how many friends are online. Each part is left out (null) if it can't be
 * loaded, so the hero always renders.
 */
export type WelcomeData = {
  name: string;
  rankKey: string;
  /* Place on the balance leaderboard (0 = not ranked yet). */
  moneyRank: number;
  /* e.g. "$1,250.00". "" if unknown. */
  balance: string;
  votes: { left: number; total: number } | null;
  friendsOnline: number | null;
};

export async function getWelcomeData(viewer: Viewer): Promise<WelcomeData> {
  const [player, voteStatus, friends] = await Promise.all([
    getPlayerByUuid(viewer.uuid).catch(() => null),
    getVoteStatus(viewer).catch(() => null),
    getOnlineFollowing(viewer.accountId).catch(() => null),
  ]);

  let votes: WelcomeData["votes"] = null;

  if (voteStatus) {
    const now = Date.now();
    const used = voteSites.filter((site) => {
      const votedAt = voteStatus[site.id] ?? 0;
      return votedAt > 0 && now - votedAt < site.cooldownHours * 60 * 60 * 1000;
    }).length;

    votes = { left: voteSites.length - used, total: voteSites.length };
  }

  return {
    name: player?.displayName || player?.username || viewer.username,
    rankKey: player?.rankKey ?? "",
    moneyRank: player?.moneyRank ?? 0,
    balance: player?.balanceFormatted ?? "",
    votes,
    friendsOnline: friends ? friends.length : null,
  };
}
