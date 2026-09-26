import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import block from "@/components/site/BlockButton.module.css";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import { FollowToggle } from "@/components/social/FollowToggle";
import type { Viewer } from "@/features/auth/types";
import {
  playtimeLabel,
  profileDate,
  rankColor,
  timeAgo,
} from "@/features/players/profile-format";
import type { PlayerProfile } from "@/features/players/types";
import styles from "./PlayerProfilePage.module.css";

/*
 * Public player profile (/player/<name>): head and name, follow button,
 * the four leaderboard stats (each links to its leaderboard) and details.
 * The data is loaded by app/player/[username]/page.tsx.
 */
export function PlayerProfilePage({
  viewer,
  topPlayers,
  player,
  isSelf,
  following,
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  player: PlayerProfile;
  isSelf: boolean;
  following: boolean;
}) {
  const name = player.displayName || player.username;
  const color = rankColor(player);

  const stats = [
    {
      key: "balance",
      label: "Balance",
      value: player.balanceFormatted,
      rank: player.moneyRank,
      note: null,
    },
    {
      key: "kd",
      label: "K/D",
      value: player.kdRatio.toFixed(2),
      rank: 0,
      note: `${player.kills.toLocaleString("en-US")} kills · ${player.deaths.toLocaleString("en-US")} deaths`,
    },
    {
      key: "kills",
      label: "Kills",
      value: player.kills.toLocaleString("en-US"),
      rank: player.killsRank,
      note: null,
    },
    {
      key: "playtime",
      label: "Playtime",
      value: playtimeLabel(player),
      rank: player.playtimeRank,
      note: null,
    },
  ];

  const details = [
    { label: "Rank", value: player.rankName || "Player" },
    {
      label: "Team",
      value: player.teamName
        ? `${player.teamName}${player.teamRole ? ` (${player.teamRole})` : ""}`
        : "No team",
    },
    { label: "First joined", value: profileDate(player.firstJoinedAt) },
    {
      label: player.online ? "Playing in" : "Last seen",
      value: player.online
        ? player.worldName || player.worldGroup || "Mineacle"
        : timeAgo(player.lastSeen),
    },
  ];

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath=""
      variant="content"
    >
      <div className={content.content}>
        <header className={styles.profile}>
          <img
            className={styles.head}
            src={playerAvatarUrl(player.uuid, 128)}
            alt=""
            referrerPolicy="no-referrer"
          />

          <div className={styles.identity}>
            <div className={styles.tags}>
              <span className={styles.status} data-online={player.online || undefined}>
                {player.online ? "Online" : "Offline"}
              </span>
              <span
                className={styles.rank}
                style={color ? { color } : undefined}
              >
                {player.rankName || "Player"}
              </span>
            </div>
            <h1>{name}</h1>
            {name !== player.username ? <p>{player.username}</p> : null}
          </div>

          <div className={styles.actions}>
            {isSelf ? (
              <a className={block.button} href="/profile">
                Account settings
              </a>
            ) : viewer ? (
              <FollowToggle
                uuid={player.uuid}
                username={player.username}
                initialFollowing={following}
              />
            ) : (
              <a className={block.button} href="/login">
                Log in to follow
              </a>
            )}
          </div>
        </header>

        <ul className={styles.stats} aria-label="Stats">
          {stats.map((stat) => (
            <li key={stat.key}>
              <a
                className={styles.stat}
                href={stat.key === "balance" ? "/leaderboards" : `/leaderboards?sort=${stat.key}`}
              >
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
                <span>
                  {stat.note ??
                    (stat.rank > 0 ? (
                      <>
                        <b>#{stat.rank.toLocaleString("en-US")}</b> overall
                      </>
                    ) : (
                      "Unranked"
                    ))}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <dl className={styles.details}>
          {details.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.links}>
          <a href={`/punishments?q=${encodeURIComponent(player.username)}`}>
            View punishment history
          </a>
        </p>
      </div>
    </FramedPage>
  );
}
