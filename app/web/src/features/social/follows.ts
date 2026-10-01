import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ensureAuthSchema } from "@/features/auth/schema";
import {
  getPlayerByUsername,
  getPlayersByUuids,
} from "@/features/players/repository";
import type { PlayerProfile } from "@/features/players/types";
import { getCoreDb } from "@/lib/db";
import { UserFacingError } from "@/shared/server/user-error";

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

export type OnlineFriend = {
  uuid: string;
  username: string;
  displayName: string;
  /* The world they're in, e.g. "Survival" ("" if unknown). */
  world: string;
  /* LuckPerms group, for the rank prefix. */
  rankKey: string;
};

/*
 * Players this account follows who are online in game right now (the
 * server keeps `online` up to date in mineacle_web_profiles). Used for the
 * "friend online" pop-ups.
 */
export async function getOnlineFollowing(accountId: number): Promise<OnlineFriend[]> {
  await ensureAuthSchema();

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT p.uuid, p.username, p.display_name, p.world_name, p.world_group, p.rank_key
     FROM mineacle_web_follows f
     JOIN mineacle_web_profiles p ON p.uuid = f.target_uuid
     WHERE f.follower_account_id = ?
       AND p.online = 1
     LIMIT 50`,
    [accountId],
  );

  return rows.map((row) => ({
    uuid: String(row.uuid),
    username: String(row.username),
    displayName: String(row.display_name || row.username),
    world: String(row.world_name || row.world_group || ""),
    rankKey: String(row.rank_key || ""),
  }));
}

/*
 * Saves "<friend> is online" in the viewer's notifications for friends the
 * pop-up just showed. Only players they follow who really are online count,
 * the same friend is saved at most once every 30 minutes, and the entries
 * are stored as already read (the pop-up was the alert).
 */
export async function recordFriendsOnline(accountId: number, uuids: string[]) {
  const wanted = new Set(uuids.map((uuid) => uuid.toLowerCase()));
  const friends = (await getOnlineFollowing(accountId)).filter((friend) =>
    wanted.has(friend.uuid.toLowerCase()),
  );
  const now = Math.floor(Date.now() / 1000);
  const db = getCoreDb();

  for (const friend of friends.slice(0, 10)) {
    const title = `${friend.displayName || friend.username} is online`.slice(0, 120);
    const [recent] = await db.execute<RowDataPacket[]>(
      `SELECT 1
       FROM mineacle_web_notifications
       WHERE account_id = ?
         AND category = 'Friends'
         AND title = ?
         AND created_at > ?
       LIMIT 1`,
      [accountId, title, now - 30 * 60],
    );

    if (recent[0]) {
      continue;
    }

    await db.execute(
      `INSERT INTO mineacle_web_notifications
         (account_id, category, title, body, created_at, read_at)
       VALUES (?, 'Friends', ?, ?, ?, ?)`,
      [
        accountId,
        title,
        friend.world ? `Playing in ${friend.world}.` : "Playing on Mineacle.",
        now,
        now,
      ],
    );
  }
}

/*
 * Players with a website account who follow this player (newest first).
 * Followers are accounts, so they're looked up by the account's UUID.
 */
export async function getFollowers(targetUuid: string): Promise<FollowingPlayer[]> {
  await ensureAuthSchema();

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT a.uuid, f.created_at
     FROM mineacle_web_follows f
     JOIN mineacle_web_accounts a ON a.id = f.follower_account_id
     WHERE f.target_uuid = ?
       AND a.disabled = 0
     ORDER BY f.created_at DESC
     LIMIT 100`,
    [targetUuid],
  );

  const profiles = await getPlayersByUuids(rows.map((row) => String(row.uuid)));
  const byUuid = new Map(profiles.map((profile) => [profile.uuid, profile]));

  return rows.flatMap((row) => {
    const profile = byUuid.get(String(row.uuid));
    return profile ? [{ profile, createdAt: Number(row.created_at || 0) }] : [];
  });
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
    throw new UserFacingError("That player has not joined Mineacle");
  }

  if (player.uuid === viewerUuid) {
    throw new UserFacingError("You cannot follow yourself");
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

  const [result] = await getCoreDb().execute<ResultSetHeader>(
    `DELETE FROM mineacle_web_follows
     WHERE follower_account_id = ?
       AND target_uuid = ?`,
    [accountId, targetUuid],
  );

  if (result.affectedRows > 0) {
    await logUnfollow(accountId, targetUuid);
  }
}

/**
 * The server refuses bounty claims between players who were connected
 * recently, and temp-bans an unfollow-then-kill. It reads this log, which
 * MineacleCore creates. Never blocks the unfollow if the log is missing.
 */
async function logUnfollow(accountId: number, targetUuid: string) {
  try {
    await getCoreDb().execute(
      `INSERT INTO mineacle_connection_log (player_a, player_b, kind, ended_at)
       SELECT uuid, ?, 'follow', ?
       FROM mineacle_web_accounts
       WHERE id = ?`,
      [targetUuid, Date.now(), accountId],
    );
  } catch (error) {
    console.warn("Could not record unfollow in mineacle_connection_log", error);
  }
}
