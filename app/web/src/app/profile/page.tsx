import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentViewer } from "@/features/auth/session";

export default async function ProfilePage() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/login");
  }

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <main className="utility-page">
        <section className="utility-card">
          <small>VERIFIED PLAYER</small>
          <h1>{viewer.username}</h1>
          <p>Your web account is tied to your Minecraft UUID.</p>

          <dl>
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
          </dl>

          <LogoutButton />
        </section>
      </main>
    </div>
  );
}
