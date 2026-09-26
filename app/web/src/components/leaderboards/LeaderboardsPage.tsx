import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import {
  LEADERBOARD_SIZE,
  leaderboardSorts,
  leaderboardValue,
} from "@/features/players/leaderboard";
import type { LeaderboardSort, PlayerProfile } from "@/features/players/types";
import styles from "./LeaderboardsPage.module.css";

/*
 * Leaderboards (/leaderboards): pick a ranking, see the top 3 on a podium
 * and places 4–50 in a table with every stat (the chosen one lit up).
 * The data is loaded by app/leaderboards/page.tsx.
 */
export function LeaderboardsPage({
  viewer,
  topPlayers,
  sort,
  players,
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  sort: LeaderboardSort;
  /* null when the database can't be reached. */
  players: PlayerProfile[] | null;
}) {
  const sortLabel = leaderboardSorts.find((item) => item.key === sort)?.label ?? "";
  const podium = players?.slice(0, 3) ?? [];
  const rest = players?.slice(3) ?? [];
  const isYou = (player: PlayerProfile) => Boolean(viewer && viewer.uuid === player.uuid);
  const profileHref = (player: PlayerProfile) => `/player/${encodeURIComponent(player.username)}`;
  const name = (player: PlayerProfile) => player.displayName || player.username;
  const subtitle = (player: PlayerProfile) =>
    player.online ? "Online" : player.teamName || player.rankName || "Player";

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/leaderboards"
      variant="content"
    >
      <div className={content.content}>
        <PageIntro tag="Leaderboards" tone="purple" title="Top Players">
          The top {LEADERBOARD_SIZE} players on Mineacle, updated live. Pick a
          ranking, then open any player to see their profile.
        </PageIntro>

        <nav className={content.chips} aria-label="Ranking">
          {leaderboardSorts.map((item) => (
            <a
              key={item.key}
              className={content.chip}
              href={item.key === "balance" ? "/leaderboards" : `/leaderboards?sort=${item.key}`}
              aria-current={item.key === sort ? "true" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {!players ? (
          <div className={content.empty}>
            <strong>Leaderboards are unavailable right now</strong>
            <p>Please try again in a minute.</p>
          </div>
        ) : players.length === 0 ? (
          <div className={content.empty}>
            <strong>No players ranked yet</strong>
            <p>Join the server and be the first on the board.</p>
          </div>
        ) : (
          <>
            <ol className={styles.podium} aria-label={`Top 3 by ${sortLabel}`}>
              {podium.map((player, index) => (
                <li key={player.uuid} className={styles.podiumPlace} data-place={index + 1}>
                  <a className={styles.podiumCard} href={profileHref(player)} data-you={isYou(player) || undefined}>
                    <span className={styles.medal}>{index + 1}</span>
                    <img
                      className={styles.podiumHead}
                      src={playerAvatarUrl(player.uuid, 96)}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <strong className={styles.podiumName}>{name(player)}</strong>
                    <small className={styles.podiumSub} data-online={player.online || undefined}>
                      {subtitle(player)}
                    </small>
                    <span className={styles.podiumValue}>
                      {leaderboardValue(sort, player)}
                      <small>{sortLabel}</small>
                    </span>
                  </a>
                </li>
              ))}
            </ol>

            {rest.length ? (
              <div className={styles.table}>
                <div className={styles.head} aria-hidden="true">
                  <span>#</span>
                  <span>Player</span>
                  {leaderboardSorts.map((column) => (
                    <span key={column.key} data-stat={column.key} data-active={column.key === sort || undefined}>
                      {column.label}
                    </span>
                  ))}
                </div>

                <ol className={styles.list} start={4}>
                  {rest.map((player, index) => (
                    <li key={player.uuid}>
                      <a className={styles.row} href={profileHref(player)} data-you={isYou(player) || undefined}>
                        <span className={styles.rank}>{index + 4}</span>
                        <span className={styles.player}>
                          <img
                            src={playerAvatarUrl(player.uuid, 40)}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          <span className={styles.playerText}>
                            <strong>
                              <span>{name(player)}</span>
                              {isYou(player) ? <em className={styles.you}>You</em> : null}
                            </strong>
                            <small data-online={player.online || undefined}>{subtitle(player)}</small>
                          </span>
                        </span>
                        {leaderboardSorts.map((column) => (
                          <span
                            key={column.key}
                            className={styles.stat}
                            data-stat={column.key}
                            data-active={column.key === sort || undefined}
                          >
                            {leaderboardValue(column.key, player)}
                          </span>
                        ))}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        )}
      </div>
    </FramedPage>
  );
}
