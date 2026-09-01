import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { FollowPlayer } from "@/components/social/FollowPlayer";
import { FollowToggle } from "@/components/social/FollowToggle";
import { getCurrentViewer } from "@/features/auth/session";
import { getFollowingPlayers } from "@/features/social/follows";

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/login");
  }

  const following = await getFollowingPlayers(viewer.accountId);

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <main className="system-page">
        <section className="system-card is-wide">
          <header className="system-page-header">
            <div>
              <small>SOCIAL</small>
              <h1>Following</h1>
              <p>
                Players here are compared against you on your Mineacle home.
              </p>
            </div>
          </header>

          <FollowPlayer />

          <div className="following-list system-following-list">
            {following.length ? (
              following.map(({ profile }) => (
                <article key={profile.uuid}>
                  <a href={`/player/${encodeURIComponent(profile.username)}`}>
                    <span className="leaderboard-avatar">
                      {profile.username.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{profile.displayName || profile.username}</strong>
                      <small>
                        {profile.online
                          ? "Online"
                          : profile.teamName || "Following"}
                      </small>
                    </span>
                  </a>

                  <FollowToggle
                    uuid={profile.uuid}
                    username={profile.username}
                    initialFollowing
                  />
                </article>
              ))
            ) : (
              <div className="system-empty">
                <strong>No followed players yet</strong>
                <p>Follow a player above or from their public profile.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
