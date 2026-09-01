import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { FollowToggle } from "@/components/social/FollowToggle";
import { getCurrentViewer } from "@/features/auth/session";
import { getPlayerByUsername } from "@/features/players/repository";
import { isFollowing } from "@/features/social/follows";

export const dynamic = "force-dynamic";

function dateLabel(epoch: number) {
  if (!epoch) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(epoch * 1000));
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [viewer, player] = await Promise.all([
    getCurrentViewer(),
    getPlayerByUsername(username),
  ]);

  if (!player) {
    notFound();
  }

  const following =
    viewer && viewer.uuid !== player.uuid
      ? await isFollowing(viewer.accountId, player.uuid)
      : false;

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />

      <main className="system-page player-profile-page">
        <section className="system-card player-profile-hero">
          <div className="player-profile-avatar">
            {player.username.slice(0, 1).toUpperCase()}
          </div>

          <div className="player-profile-identity">
            <small>{player.online ? "ONLINE" : "PLAYER PROFILE"}</small>
            <h1>{player.displayName || player.username}</h1>
            {player.displayName &&
            player.displayName !== player.username ? (
              <p>{player.username}</p>
            ) : null}
          </div>

          {viewer && viewer.uuid !== player.uuid ? (
            <FollowToggle
              uuid={player.uuid}
              username={player.username}
              initialFollowing={following}
            />
          ) : null}
        </section>

        <section className="system-grid player-stat-grid">
          <article className="system-card">
            <small>BALANCE</small>
            <strong>{player.balanceFormatted}</strong>
            <span>
              {player.moneyRank > 0 ? `Global #${player.moneyRank}` : "Unranked"}
            </span>
          </article>

          <article className="system-card">
            <small>K/D</small>
            <strong>{player.kdRatio.toFixed(2)}</strong>
            <span>
              {player.kills.toLocaleString()} kills ·{" "}
              {player.deaths.toLocaleString()} deaths
            </span>
          </article>

          <article className="system-card">
            <small>PLAYTIME</small>
            <strong>
              {player.playtimeFormatted ||
                `${Math.floor(player.playtimeSeconds / 3600)}h`}
            </strong>
            <span>
              {player.playtimeRank > 0
                ? `Global #${player.playtimeRank}`
                : "Unranked"}
            </span>
          </article>

          <article className="system-card">
            <small>TEAM</small>
            <strong>{player.teamName || "No team"}</strong>
            <span>{player.teamRole || "Independent"}</span>
          </article>
        </section>

        <section className="system-card player-profile-details">
          <div>
            <small>RANK</small>
            <strong>{player.rankName || "Player"}</strong>
          </div>
          <div>
            <small>WORLD</small>
            <strong>{player.worldName || player.worldGroup || "Offline"}</strong>
          </div>
          <div>
            <small>FIRST JOINED</small>
            <strong>{dateLabel(player.firstJoinedAt)}</strong>
          </div>
          <div>
            <small>LAST SEEN</small>
            <strong>{player.online ? "Now" : dateLabel(player.lastSeen)}</strong>
          </div>
        </section>
      </main>
    </div>
  );
}
