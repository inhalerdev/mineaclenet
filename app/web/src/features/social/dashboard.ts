import type { RowDataPacket } from "mysql2";
import type { Viewer } from "@/features/auth/types";
import { ensureAuthSchema } from "@/features/auth/schema";
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

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function mapProfile(
  row: RowDataPacket,
  viewerUuid: string,
): Omit<FriendStat, "friendRank"> {
  const balanceCents = numberValue(row.balance_cents);
  const formatted = textValue(row.balance_formatted);

  return {
    uuid: textValue(row.uuid),
    username:
      textValue(row.display_name) ||
      textValue(row.username) ||
      "Unknown",
    balanceCents,
    balance:
      formatted ||
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(balanceCents / 100),
    kd: numberValue(row.kd_ratio),
    team: textValue(row.team_name),
    online: numberValue(row.online) > 0,
    isViewer: textValue(row.uuid) === viewerUuid,
  };
}

export async function getDashboard(viewer: Viewer): Promise<DashboardData> {
  await ensureAuthSchema();

  const db = getCoreDb();

  try {
    const [viewerRows] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM mineacle_web_profiles WHERE uuid = ? LIMIT 1",
      [viewer.uuid],
    );

    const [followRows] = await db.execute<RowDataPacket[]>(
      `SELECT p.*
       FROM mineacle_web_follows f
       INNER JOIN mineacle_web_profiles p ON p.uuid = f.target_uuid
       WHERE f.follower_account_id = ?
       ORDER BY f.created_at DESC
       LIMIT 12`,
      [viewer.accountId],
    );

    const combined = [...viewerRows.slice(0, 1), ...followRows]
      .map((row) => mapProfile(row, viewer.uuid))
      .filter((row) => row.uuid);

    combined.sort((a, b) => b.balanceCents - a.balanceCents);

    const friends = combined.map((row, index) => ({
      ...row,
      friendRank: index + 1,
    }));

    const [notificationRows] = await db.execute<RowDataPacket[]>(
      `SELECT id, category, title, body
       FROM mineacle_web_notifications
       WHERE account_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [viewer.accountId],
    );

    const viewerProfile = viewerRows[0];

    return {
      friends,
      activity: notificationRows.map((row) => ({
        id: numberValue(row.id),
        category: textValue(row.category),
        title: textValue(row.title),
        body: textValue(row.body),
      })),
      viewerTeam: viewerProfile ? textValue(viewerProfile.team_name) : "",
      viewerTeamRole: viewerProfile ? textValue(viewerProfile.team_role) : "",
    };
  } catch {
    return {
      friends: [],
      activity: [],
      viewerTeam: "",
      viewerTeamRole: "",
    };
  }
}
