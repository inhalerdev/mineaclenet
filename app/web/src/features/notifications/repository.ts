import type { RowDataPacket } from "mysql2";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getCoreDb } from "@/lib/db";

export type AccountNotification = {
  id: number;
  category: string;
  title: string;
  body: string;
  /* Seconds since 1970. */
  createdAt: number;
  unread: boolean;
};

type NotificationRow = RowDataPacket & {
  id: number | string;
  category: string | null;
  title: string | null;
  body: string | null;
  created_at: number | string | null;
  read_at: number | string | null;
};

/* The newest notifications for one account (only ever the viewer's own). */
export async function getNotifications(
  accountId: number,
  limit = 50,
): Promise<AccountNotification[]> {
  await ensureAuthSchema();

  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const [rows] = await getCoreDb().execute<NotificationRow[]>(
    `SELECT id, category, title, body, created_at, read_at
     FROM mineacle_web_notifications
     WHERE account_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ${safeLimit}`,
    [accountId],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    category: String(row.category || "").trim(),
    title: String(row.title || "").trim() || "Notification",
    body: String(row.body || "").trim(),
    createdAt: Number(row.created_at || 0),
    unread: !Number(row.read_at || 0),
  }));
}
