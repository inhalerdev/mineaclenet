import { redirect } from "next/navigation";
import { AccountSecurity } from "@/components/account/AccountSecurity";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AppSidebar } from "@/components/shell/AppSidebar";
import {
  getActiveSessionCount,
  getCurrentViewer,
} from "@/features/auth/session";
import { getPlayerByUuid } from "@/features/players/repository";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/login");
  }

  const [player, sessionCount] = await Promise.all([
    getPlayerByUuid(viewer.uuid),
    getActiveSessionCount(viewer.accountId),
  ]);

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />

      <main className="system-page">
        <section className="system-card profile-account-card">
          <header className="system-page-header">
            <div>
              <small>VERIFIED PLAYER</small>
              <h1>{viewer.username}</h1>
              <p>Your web account is anchored to your Minecraft UUID.</p>
            </div>

            <div className="profile-account-actions">
              <a href={`/player/${encodeURIComponent(viewer.username)}`}>
                Public profile
              </a>
              <LogoutButton />
            </div>
          </header>

          <dl className="profile-account-stats">
            <div>
              <dt>UUID</dt>
              <dd>{viewer.uuid}</dd>
            </div>
            <div>
              <dt>Following</dt>
              <dd>{viewer.followingCount}</dd>
            </div>
            <div>
              <dt>Unread notifications</dt>
              <dd>{viewer.unreadNotifications}</dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd>{player?.balanceFormatted || "Unavailable"}</dd>
            </div>
          </dl>

          <AccountSecurity sessionCount={sessionCount} />
        </section>
      </main>
    </div>
  );
}
