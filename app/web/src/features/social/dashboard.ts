import type { RowDataPacket } from "mysql2";
import type { Viewer } from "@/features/auth/types";
import {
  getPlayerByUuid,
} from "@/features/players/repository";
import type { PlayerProfile } from "@/features/players/types";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getFollowingPlayers } from "@/features/social/follows";
import { getCoreDb } from "@/lib/db";

export type FriendStat = {
  uuid: string;
  username: string;
  balanceCents: number;
  balance: string;
  kd: number;
  team: string;
  online: boolean;
  friendRank: number;
  isViewer: boolean;
};

export type ActivityItem = {
  id: number;
  category: string;
  title: string;
  body: string;
};

export type DashboardData = {
  friends: FriendStat[];
  activity: ActivityItem[];
  viewerTeam: string;
  viewerTeamRole: string;
};

function friendFromProfile(
  profile: PlayerProfile,
  viewerUuid: string,
): Omit<FriendStat, "friendRank"> {
  return {
    uuid: profile.uuid,
    username: profile.displayName || profile.username,
    balanceCents: profile.balanceCents,
    balance: profile.balanceFormatted,
    kd: profile.kdRatio,
    team: profile.teamName,
    online: profile.online,
    isViewer: profile.uuid === viewerUuid,
  };
}

export async function getDashboard(viewer: Viewer): Promise<DashboardData> {
  await ensureAuthSchema();

  try {
    const [viewerProfile, following] = await Promise.all([
      getPlayerByUuid(viewer.uuid),
      getFollowingPlayers(viewer.accountId),
    ]);

    const combined = [
      ...(viewerProfile ? [viewerProfile] : []),
      ...following.map((item) => item.profile),
    ]
      .map((profile) => friendFromProfile(profile, viewer.uuid))
      .filter((row) => row.uuid);

    combined.sort((a, b) => b.balanceCents - a.balanceCents);

    const friends = combined.map((row, index) => ({
      ...row,
      friendRank: index + 1,
    }));

    const [notificationRows] = await getCoreDb().execute<RowDataPacket[]>(
      `SELECT id, category, title, body
       FROM mineacle_web_notifications
       WHERE account_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [viewer.accountId],
    );

    return {
      friends,
      activity: notificationRows.map((row) => ({
        id: Number(row.id || 0),
        category: String(row.category || ""),
        title: String(row.title || ""),
        body: String(row.body || ""),
      })),
      viewerTeam: viewerProfile?.teamName || "",
      viewerTeamRole: viewerProfile?.teamRole || "",
    };
  } catch (error) {
    console.error("[mineacle-social] Dashboard data failed", error);

    return {
      friends: [],
      activity: [],
      viewerTeam: "",
      viewerTeamRole: "",
    };
  }
}
