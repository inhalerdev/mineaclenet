import type { CSSProperties } from "react";
import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import { RankPrefix } from "@/components/players/RankPrefix";
import { VerifiedBadge } from "@/components/players/VerifiedBadge";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro, StatTile } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import {
  LEADERBOARD_SIZE,
  leaderboardSorts,
  leaderboardValue,
} from "@/features/players/leaderboard";
import type { LeaderboardSort, PlayerProfile } from "@/features/players/types";
import { mineacleStatIcons } from "@/shared/icons/mineacle-icons";
import styles from "./LeaderboardsPage.module.css";

/*
 * Leaderboards (/leaderboards), game style:
 *
 *   - The four rankings are a hotbar: one slot each with its item icon
 *     (emerald, skull, sword, clock) and its color; the chosen one has the
 *     selected-slot frame.
 *   - The top 3 stand on a podium: 2nd, 1st, 3rd on blocks of different
 *     heights (gold, iron, copper), on phones too.
 *   - Places 4–50 are rows with the chosen stat large in its color; wider
 *     screens also show the other three stats.
 *   - Your own spot gets the white selected-slot frame and a YOU tag, and
 *     the intro tells you your place.
 *
 * Rankings are links (?sort=), so they work without JavaScript. The data is
 * loaded by app/leaderboards/page.tsx.
 */
const STAT_META: Record<LeaderboardSort, { blurb: string; color: string }> = {
  balance: { blurb: "Richest players", color: "var(--mc-stat-money)" },
  kd: { blurb: "Best kill/death", color: "var(--mc-purple-face)" },
  kills: { blurb: "Most kills", color: "#ff5c5c" },
  playtime: { blurb: "Most time played", color: "var(--mc-stat-playtime)" },
};

const PLACE_NAMES = ["Gold", "Iron", "Copper"];

export function LeaderboardsPage({
  viewer,
  topPlayers,
  sort,
  players,
  verifiedUuids = [],
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  sort: LeaderboardSort;
  /* null when the database can't be reached. */
  players: PlayerProfile[] | null;
  /* Lower-case UUIDs of players with a linked website account. */
  verifiedUuids?: string[];
}) {
  const sortLabel = leaderboardSorts.find((item) => item.key === sort)?.label ?? "";
  const meta = STAT_META[sort];
  const podium = players?.slice(0, 3) ?? [];
  const rest = players?.slice(3) ?? [];
  const verified = new Set(verifiedUuids);
  const isVerified = (player: PlayerProfile) => verified.has(player.uuid.toLowerCase());
  const isYou = (player: PlayerProfile) => Boolean(viewer && viewer.uuid === player.uuid);
  const yourPlace = viewer && players ? players.findIndex(isYou) + 1 : 0;
  const href = (key: LeaderboardSort) => (key === "balance" ? "/leaderboards" : `/leaderboards?sort=${key}`);
  const accent = { "--stat": meta.color } as CSSProperties;

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/leaderboards"
      variant="content"
    >
      <div className={content.content} style={accent}>
        <PageIntro
          tag="Leaderboards"
          tone="purple"
          title="Top Players"
          aside={
            yourPlace ? (
              <dl className={content.stats}>
                <StatTile label={`Your ${sortLabel} rank`}>
                  <img src={mineacleStatIcons[sort]} alt="" />
                  <span>#{yourPlace}</span>
                </StatTile>
              </dl>
            ) : null
          }
        >
          The top {LEADERBOARD_SIZE} players on Mineacle, updated live. Pick a
          ranking, then open any player to see their profile.
        </PageIntro>

        <nav className={styles.hotbar} aria-label="Ranking">
          {leaderboardSorts.map((item) => (
            <a
              key={item.key}
              className={styles.slot}
              href={href(item.key)}
              aria-current={item.key === sort ? "page" : undefined}
              style={{ "--slot": STAT_META[item.key].color } as CSSProperties}
            >
              <img src={mineacleStatIcons[item.key]} alt="" />
              <span className={styles.slotText}>
                <strong>{item.label}</strong>
                <small>{STAT_META[item.key].blurb}</small>
              </span>
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
                <li key={player.uuid} className={styles.place} data-place={index + 1}>
                  <a
                    className={styles.standing}
                    href={`/player/${encodeURIComponent(player.username)}`}
                    data-you={isYou(player) || undefined}
                    aria-label={`${index + 1}. ${player.displayName || player.username}, ${leaderboardValue(sort, player)} ${sortLabel}`}
                  >
                    {isYou(player) ? <em className={styles.you}>You</em> : null}
                    <img
                      className={styles.head}
                      src={playerAvatarUrl(player.uuid, 96)}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <strong className={styles.name}>
                      <span>
                        <RankPrefix rankKey={player.rankKey} />
                        {player.displayName || player.username}
                      </span>
                      {isVerified(player) ? <VerifiedBadge /> : null}
                    </strong>
                    <span className={styles.value}>{leaderboardValue(sort, player)}</span>
                  </a>
                  <div className={styles.block} aria-hidden="true">
                    <span>{index + 1}</span>
                    <small>{PLACE_NAMES[index]}</small>
                  </div>
                </li>
              ))}
            </ol>

            {rest.length ? (
              <ol className={styles.list} start={4} aria-label={`Places 4 to ${players.length}`}>
                {rest.map((player, index) => (
                  <li key={player.uuid}>
                    <a
                      className={styles.row}
                      href={`/player/${encodeURIComponent(player.username)}`}
                      data-you={isYou(player) || undefined}
                    >
                      <span className={styles.rank}>{index + 4}</span>
                      <img
                        className={styles.rowHead}
                        src={playerAvatarUrl(player.uuid, 40)}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <span className={styles.who}>
                        <strong>
                          <span>
                            <RankPrefix rankKey={player.rankKey} />
                            {player.displayName || player.username}
                          </span>
                          {isVerified(player) ? <VerifiedBadge /> : null}
                          {isYou(player) ? <em className={styles.you}>You</em> : null}
                        </strong>
                        <small data-online={player.online || undefined}>
                          {player.online ? "Online" : player.teamName || player.rankName || "Player"}
                        </small>
                      </span>
                      <span className={styles.others}>
                        {leaderboardSorts
                          .filter((column) => column.key !== sort)
                          .map((column) => (
                            <span key={column.key} title={column.label}>
                              <img src={mineacleStatIcons[column.key]} alt={column.label} />
                              {leaderboardValue(column.key, player)}
                            </span>
                          ))}
                      </span>
                      <span className={styles.main}>
                        {leaderboardValue(sort, player)}
                        <small>{sortLabel}</small>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        )}
      </div>
    </FramedPage>
  );
}
