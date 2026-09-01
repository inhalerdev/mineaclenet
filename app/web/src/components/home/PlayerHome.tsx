import { LogoutButton } from "@/components/auth/LogoutButton";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import type { Viewer } from "@/features/auth/types";
import type { DashboardData } from "@/features/social/dashboard";

export function PlayerHome({
  viewer,
  dashboard,
}: {
  viewer: Viewer;
  dashboard: DashboardData;
}) {
  return (
    <main className="player-home">
      <header className="player-home__top">
        <div>
          <small>YOUR MINEACLE</small>
          <strong>Welcome back, {viewer.username}</strong>
        </div>

        <div className="player-home__top-actions">
          <a href="/following">Following {viewer.followingCount}</a>
          <a href="/notifications">
            Notifications
            {viewer.unreadNotifications > 0 ? (
              <span>{viewer.unreadNotifications}</span>
            ) : null}
          </a>
          <a className="player-profile-pill" href="/profile">
            <PlayerAvatar
              uuid={viewer.uuid}
              size={34}
              className="player-profile-pill__avatar"
              eager
            />
          </a>
          <LogoutButton className="player-home__logout" />
        </div>
      </header>

      <section className="player-home-grid">
        <article className="dashboard-panel dashboard-panel--overview">
          <small>SOCIAL COMPETITION</small>
          <h1>See Mineacle through your circle.</h1>
          <p>
            Your friends, your team and the server-wide competition in one place.
          </p>

          <div className="overview-links">
            <a href="/following">Manage following →</a>
            <a href="/leaderboards">Global leaderboards →</a>
          </div>
        </article>

        <article className="dashboard-panel dashboard-panel--friends">
          <header>
            <div>
              <small>BALANCE</small>
              <h2>Friends leaderboard</h2>
            </div>
            <a href="/leaderboards">Global →</a>
          </header>

          {dashboard.friends.length ? (
            <div className="friend-ranking">
              {dashboard.friends.slice(0, 7).map((friend) => (
                <div
                  className={`friend-ranking__row ${
                    friend.isViewer ? "is-you" : ""
                  }`}
                  key={friend.uuid}
                >
                  <b>#{friend.friendRank}</b>
                  <PlayerAvatar
                    uuid={friend.uuid}
                    size={30}
                    className="friend-avatar"
                  />
                  <span className="friend-name">
                    <strong>{friend.username}</strong>
                    <small>
                      {friend.isViewer
                        ? "You"
                        : friend.online
                          ? "Online"
                          : friend.team || "Following"}
                    </small>
                  </span>
                  <span className="friend-stat">
                    <strong>{friend.balance}</strong>
                    <small>K/D {friend.kd.toFixed(2)}</small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <strong>Build your Mineacle circle</strong>
              <p>
                Follow players to compare real balance and K/D data here.
              </p>
              <a href="/following">Follow your first player →</a>
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel--activity">
          <header>
            <div>
              <small>ACTIVITY</small>
              <h2>Your feed</h2>
            </div>
            <a href="/notifications">View all →</a>
          </header>

          {dashboard.activity.length ? (
            <div className="activity-list">
              {dashboard.activity.map((item) => (
                <div key={item.id}>
                  <small>{item.category}</small>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty is-small">
              <strong>Quiet for now</strong>
              <p>
                Meaningful leaderboard, player and team events will appear here.
              </p>
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel--team">
          <small>YOUR TEAM</small>
          <h2>{dashboard.viewerTeam || "No team yet"}</h2>
          <p>
            {dashboard.viewerTeam
              ? `${dashboard.viewerTeamRole || "Member"} · Open the team hub for your team view`
              : "Join or create a team in-game to bring your team into this dashboard"}
          </p>
          <a href="/team">Open team hub →</a>
        </article>

        <a
          className="dashboard-panel dashboard-panel--global"
          href="/leaderboards"
        >
          <img src="/images/home/leaderboards.jpg" alt="" />
          <span />
          <div>
            <small>GLOBAL</small>
            <strong>See the whole server</strong>
            <p>Leaderboards →</p>
          </div>
        </a>
      </section>
    </main>
  );
}
