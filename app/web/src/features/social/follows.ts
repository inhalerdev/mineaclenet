import type { RowDataPacket } from "mysql2";
import { ensureAuthSchema } from "@/features/auth/schema";
import {
  getPlayerByUsername,
  getPlayersByUuids,
} from "@/features/players/repository";
import type { PlayerProfile } from "@/features/players/types";
import { getCoreDb } from "@/lib/db";

type FollowRow = RowDataPacket & {
  target_uuid: string;
  target_username: string;
  created_at: number | string;
};

export type FollowingPlayer = {
  profile: PlayerProfile;
  createdAt: number;
};

export async function getFollowingPlayers(
  accountId: number,
): Promise<FollowingPlayer[]> {
  await ensureAuthSchema();

  const [rows] = await getCoreDb().execute<FollowRow[]>(
    `SELECT target_uuid, target_username, created_at
     FROM mineacle_web_follows
     WHERE follower_account_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [accountId],
  );

  const profiles = await getPlayersByUuids(
    rows.map((row) => String(row.target_uuid)),
  );
  const byUuid = new Map(
    profiles.map((profile) => [profile.uuid, profile]),
  );

  const result: FollowingPlayer[] = [];

  for (const row of rows) {
    const uuid = String(row.target_uuid);
    const profile = byUuid.get(uuid);

    if (!profile) {
      continue;
    }

    result.push({
      profile,
      createdAt: Number(row.created_at || 0),
    });

    if (
      profile.username &&
      profile.username.toLowerCase() !==
        String(row.target_username || "").toLowerCase()
    ) {
      await getCoreDb().execute(
        `UPDATE mineacle_web_follows
         SET target_username = ?
         WHERE follower_account_id = ?
           AND target_uuid = ?`,
        [profile.username, accountId, uuid],
      );
    }
  }

  return result;
}

export async function isFollowing(
  accountId: number,
  targetUuid: string,
) {
  await ensureAuthSchema();

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT 1
     FROM mineacle_web_follows
     WHERE follower_account_id = ?
       AND target_uuid = ?
     LIMIT 1`,
    [accountId, targetUuid],
  );

  return Boolean(rows[0]);
}

export async function followByUsername(
  accountId: number,
  viewerUuid: string,
  username: string,
) {
  await ensureAuthSchema();

  const player = await getPlayerByUsername(username);

  if (!player) {
    throw new Error("That player has not joined Mineacle");
  }

  if (player.uuid === viewerUuid) {
    throw new Error("You cannot follow yourself");
  }

  const now = Math.floor(Date.now() / 1000);

  await getCoreDb().execute(
    `INSERT INTO mineacle_web_follows
      (follower_account_id, target_uuid, target_username, created_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       target_username = VALUES(target_username)`,
    [accountId, player.uuid, player.username, now],
  );

  return player;
}

export async function unfollowByUuid(
  accountId: number,
  targetUuid: string,
) {
  await ensureAuthSchema();

  await getCoreDb().execute(
    `DELETE FROM mineacle_web_follows
     WHERE follower_account_id = ?
       AND target_uuid = ?`,
    [accountId, targetUuid],
  );
}
