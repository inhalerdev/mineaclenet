import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentViewer } from "@/features/auth/session";
import { getPlayerLeaderboard } from "@/features/players/repository";
import type { LeaderboardSort } from "@/features/players/types";
import styles from "./Leaderboards.module.css";

export const dynamic = "force-dynamic";

const SORTS: Array<{
  key: LeaderboardSort;
  label: string;
}> = [
  { key: "balance", label: "Balance" },
  { key: "kd", label: "K/D" },
  { key: "kills", label: "Kills" },
  { key: "playtime", label: "Playtime" },
];

function isSort(value: string): value is LeaderboardSort {
  return SORTS.some((item) => item.key === value);
}

function primaryValue(
  sort: LeaderboardSort,
  player: Awaited<
    ReturnType<typeof getPlayerLeaderboard>
  >[number],
) {
  switch (sort) {
    case "kd":
      return player.kdRatio.toFixed(2);
    case "kills":
      return player.kills.toLocaleString();
    case "playtime":
      return (
        player.playtimeFormatted ||
        `${Math.floor(player.playtimeSeconds / 3600)}h`
      );
    default:
      return player.balanceFormatted;
  }
}

function rankClass(index: number) {
  if (index === 0) return styles.first;
  if (index === 1) return styles.second;
  if (index === 2) return styles.third;
  return "";
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const requested = params.sort || "balance";
  const sort: LeaderboardSort = isSort(requested)
    ? requested
    : "balance";

  const [viewer, players] = await Promise.all([
    getCurrentViewer(),
    getPlayerLeaderboard(sort, 50),
  ]);

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />

      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <small>GLOBAL COMPETITION</small>
              <h1>Leaderboards</h1>
              <p>
                Live player rankings from Mineacle server
                data.
              </p>
            </div>

            <PlayerSearch
              className={styles.search}
              placeholder="Find a player"
            />
          </section>

          <nav
            className={styles.tabs}
            aria-label="Leaderboard metric"
          >
            {SORTS.map((item) => (
              <a
                className={
                  item.key === sort ? styles.activeTab : ""
                }
                href={`/leaderboards?sort=${item.key}`}
                key={item.key}
                aria-current={
                  item.key === sort ? "page" : undefined
                }
              >
                {item.label}
              </a>
            ))}
          </nav>

          <section className={styles.ranking}>
            <header className={styles.rankingHeader}>
              <span>RANK</span>
              <span>PLAYER</span>
              <span>{sort.toUpperCase()}</span>
            </header>

            <div className={styles.list}>
              {players.length > 0 ? (
                players.map((player, index) => (
                  <a
                    className={`${styles.row} ${rankClass(index)}`}
                    href={`/player/${encodeURIComponent(
                      player.username,
                    )}`}
                    key={player.uuid}
                  >
                    <b className={styles.rank}>
                      #{index + 1}
                    </b>

                    <PlayerAvatar
                      uuid={player.uuid}
                      size={38}
                      className={styles.avatar}
                    />

                    <span className={styles.player}>
                      <strong>
                        {player.displayName ||
                          player.username}
                      </strong>
                      <small
                        className={
                          player.online
                            ? styles.online
                            : undefined
                        }
                      >
                        {player.online
                          ? "Online now"
                          : player.teamName ||
                            player.rankName ||
                            "Player"}
                      </small>
                    </span>

                    <span className={styles.value}>
                      <strong>
                        {primaryValue(sort, player)}
                      </strong>
                      <small>
                        {sort === "kd"
                          ? `${player.kills.toLocaleString()} kills`
                          : sort === "balance"
                            ? `K/D ${player.kdRatio.toFixed(2)}`
                            : player.balanceFormatted}
                      </small>
                    </span>

                    <span
                      className={styles.rowArrow}
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </a>
                ))
              ) : (
                <div className={styles.empty}>
                  <strong>No rankings available</strong>
                  <p>
                    Mineacle has not returned leaderboard
                    data for this metric yet.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
