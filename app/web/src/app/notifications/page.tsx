import type { RowDataPacket } from "mysql2";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getCurrentViewer } from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

export default async function NotificationsPage() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/login");
  }

  await ensureAuthSchema();

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT id, category, title, body
     FROM mineacle_web_notifications
     WHERE account_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [viewer.accountId],
  );

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <main className="utility-page">
        <section className="utility-card is-wide">
          <small>ACTIVITY</small>
          <h1>Notifications</h1>

          <div className="notification-list">
            {rows.length ? (
              rows.map((row) => (
                <article key={String(row.id)}>
                  <small>{String(row.category)}</small>
                  <strong>{String(row.title)}</strong>
                  <p>{String(row.body)}</p>
                </article>
              ))
            ) : (
              <div className="dashboard-empty">
                <strong>Nothing new yet</strong>
                <p>
                  Player milestones, leaderboard movement and team activity
                  will appear here when those events occur.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
