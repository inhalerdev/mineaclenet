import type { RowDataPacket } from "mysql2";
import { getCoreDb } from "@/lib/db";
import { matchVoteSite, voteSites } from "./vote-sites";

/*
 * When a player last voted on each site, from the votes the Minecraft server
 * saves in mineacle_web_votes (MineacleCore, VoteHistoryRepository). Only
 * real votes sent by the voting sites are saved, never clicks on our links.
 */

/* Site id -> time of the latest vote (milliseconds). */
export type VoteStatus = Record<string, number>;

type VoteRow = RowDataPacket & {
  service: string | null;
  last_vote: number | string | null;
};

const LONGEST_COOLDOWN_MS =
  Math.max(24, ...voteSites.map((site) => site.cooldownHours)) * 60 * 60 * 1000;

/*
 * The viewer's recent votes. Votes are matched by UUID, or by name for votes
 * made before the player had ever joined. Returns {} until the server has
 * created the table, and null if the database can't be reached.
 */
export async function getVoteStatus(viewer: {
  uuid: string;
  username: string;
}): Promise<VoteStatus | null> {
  try {
    const [rows] = await getCoreDb().execute<VoteRow[]>(
      `SELECT service, MAX(voted_at) AS last_vote
       FROM mineacle_web_votes
       WHERE (uuid = ? OR (uuid IS NULL AND username = ?))
         AND voted_at >= ?
       GROUP BY service`,
      [viewer.uuid.toLowerCase(), viewer.username, Date.now() - LONGEST_COOLDOWN_MS],
    );

    const status: VoteStatus = {};

    for (const row of rows) {
      const site = matchVoteSite(String(row.service || ""));
      const votedAt = Number(row.last_vote || 0);

      if (site && votedAt > (status[site.id] ?? 0)) {
        status[site.id] = votedAt;
      }
    }

    return status;
  } catch (error) {
    // The server creates the table the first time it starts with vote
    // history; until then there's simply nothing to show.
    if ((error as { code?: string }).code === "ER_NO_SUCH_TABLE") {
      return {};
    }

    console.error("[mineacle-vote] Could not load vote status", error);
    return null;
  }
}
