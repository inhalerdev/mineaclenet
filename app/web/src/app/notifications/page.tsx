import type { RowDataPacket } from "mysql2";
import { redirect } from "next/navigation";
import { MarkNotificationsRead } from "@/components/notifications/MarkNotificationsRead";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getCurrentViewer } from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/login");
  }

  await ensureAuthSchema();

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT id, category, title, body, created_at, read_at
     FROM mineacle_web_notifications
     WHERE account_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [viewer.accountId],
  );

  const hasUnread = rows.some((row) => !Number(row.read_at || 0));

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />

      <main className="system-page">
        <section className="system-card is-wide">
          <header className="system-page-header">
            <div>
              <small>ACTIVITY</small>
              <h1>Notifications</h1>
            </div>

            <MarkNotificationsRead hasUnread={hasUnread} />
          </header>

          <div className="notification-list system-notification-list">
            {rows.length ? (
              rows.map((row) => (
                <article
                  className={!Number(row.read_at || 0) ? "is-unread" : ""}
                  key={String(row.id)}
                >
                  <small>{String(row.category)}</small>
                  <strong>{String(row.title)}</strong>
                  <p>{String(row.body)}</p>
                </article>
              ))
            ) : (
              <div className="system-empty">
                <strong>Nothing new yet</strong>
                <p>
                  Real player and team events will appear here as those
                  integrations are enabled.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
