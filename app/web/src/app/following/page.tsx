import type { RowDataPacket } from "mysql2";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { FollowPlayer } from "@/components/social/FollowPlayer";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getCurrentViewer } from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

export default async function FollowingPage() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/login");
  }

  await ensureAuthSchema();

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT target_uuid, target_username
     FROM mineacle_web_follows
     WHERE follower_account_id = ?
     ORDER BY created_at DESC`,
    [viewer.accountId],
  );

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <main className="utility-page">
        <section className="utility-card is-wide">
          <small>SOCIAL</small>
          <h1>Following</h1>
          <p>
            Players you follow are compared against you on your Mineacle home.
          </p>

          <FollowPlayer />

          <div className="following-list">
            {rows.map((row) => (
              <a href={`/player/${row.target_username}`} key={String(row.target_uuid)}>
                <span>{String(row.target_username).slice(0, 1).toUpperCase()}</span>
                <strong>{String(row.target_username)}</strong>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
