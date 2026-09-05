import { LogoutButton } from "@/components/auth/LogoutButton";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PlayerSearch } from "@/components/players/PlayerSearch";
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
        <div className="player-home__identity">
          <small>PLAYER HOME</small>
          <strong>{viewer.username}</strong>
        </div>

        <PlayerSearch
          className="player-home__search"
          placeholder="Find a Mineacle player"
        />

        <nav className="player-home__top-actions" aria-label="Player shortcuts">
          <a href="/following">
            <span>Following</span>
            <b>{viewer.followingCount}</b>
          </a>
          <a href="/notifications">
            <span>Notifications</span>
            {viewer.unreadNotifications > 0 ? (
              <b>{viewer.unreadNotifications}</b>
            ) : null}
          </a>
          <a className="player-profile-pill" href="/profile">
            <PlayerAvatar
              uuid={viewer.uuid}
              size={34}
              className="player-profile-pill__avatar"
              eager
            />
            <span>Profile</span>
          </a>
          <LogoutButton className="player-home__logout" />
        </nav>
      </header>

      <section className="player-home-grid">
        <article className="dashboard-panel dashboard-panel--overview">
          <small>YOUR MINEACLE</small>
          <h1>Welcome back, {viewer.username}.</h1>
          <p>
            Search players, compare progress, collect rewards, and reach every
            competitive area from one fast dashboard.
          </p>

          <nav className="overview-links" aria-label="Quick actions">
            <a href="/profile">
              <img
                src="/shared/images/icons/streamline/core-solid/user.svg"
                alt=""
              />
              <span>
                <strong>My profile</strong>
                <small>Account and security</small>
              </span>
              <b>→</b>
            </a>
            <a href="/leaderboards">
              <img
                src="/shared/images/icons/streamline/core-solid/leaderboards.svg"
                alt=""
              />
              <span>
                <strong>Leaderboards</strong>
                <small>Compare server rankings</small>
              </span>
              <b>→</b>
            </a>
            <a href="/vote">
              <img
                src="/shared/images/icons/streamline/core-solid/rewards.svg"
                alt=""
              />
              <span>
                <strong>Vote rewards</strong>
                <small>Open active vote sites</small>
              </span>
              <b>→</b>
            </a>
            <a href="/punishments">
              <img
                src="/shared/images/icons/streamline/core-solid/punishments.svg"
                alt=""
              />
              <span>
                <strong>Punishments</strong>
                <small>Search public records</small>
              </span>
              <b>→</b>
            </a>
          </nav>
        </article>

        <a
          className="dashboard-panel dashboard-panel--global"
          href="/leaderboards"
        >
          <img src="/images/home/leaderboards.jpg" alt="" />
          <span />
          <div>
            <small>GLOBAL COMPETITION</small>
            <strong>See the whole server</strong>
            <p>Open leaderboards →</p>
          </div>
        </a>

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
              {dashboard.friends.slice(0, 4).map((friend) => (
                <a
                  className={`friend-ranking__row ${
                    friend.isViewer ? "is-you" : ""
                  }`}
                  href={`/player/${encodeURIComponent(friend.username)}`}
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
                </a>
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
              {dashboard.activity.slice(0, 3).map((item) => (
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

        <a className="dashboard-panel dashboard-panel--team" href="/team">
          <small>YOUR TEAM</small>
          <h2>{dashboard.viewerTeam || "No team yet"}</h2>
          <p>
            {dashboard.viewerTeam
              ? `${dashboard.viewerTeamRole || "Member"} · Open the team hub for your team view`
              : "Join or create a team in-game to bring your team into this dashboard"}
          </p>
          <b>Open team hub →</b>
        </a>
      </section>
    </main>
  );
}
