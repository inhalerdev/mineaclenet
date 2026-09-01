import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentViewer } from "@/features/auth/session";
import { getPlayerLeaderboard } from "@/features/players/repository";
import type { LeaderboardSort } from "@/features/players/types";

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
  player: Awaited<ReturnType<typeof getPlayerLeaderboard>>[number],
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

      <main className="system-page">
        <section className="system-card leaderboard-shell">
          <header className="system-page-header">
            <div>
              <small>GLOBAL</small>
              <h1>Leaderboards</h1>
              <p>Live player rankings from Mineacle server data.</p>
            </div>

            <nav className="leaderboard-tabs" aria-label="Leaderboard metric">
              {SORTS.map((item) => (
                <a
                  className={item.key === sort ? "is-active" : ""}
                  href={`/leaderboards?sort=${item.key}`}
                  key={item.key}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>

          <div className="leaderboard-list">
            {players.map((player, index) => (
              <a
                className="leaderboard-row"
                href={`/player/${encodeURIComponent(player.username)}`}
                key={player.uuid}
              >
                <b>#{index + 1}</b>
                <PlayerAvatar
                  uuid={player.uuid}
                  size={34}
                  className="leaderboard-avatar"
                />
                <span className="leaderboard-player">
                  <strong>{player.displayName || player.username}</strong>
                  <small>
                    {player.online
                      ? "Online"
                      : player.teamName || player.rankName || "Player"}
                  </small>
                </span>
                <span className="leaderboard-value">
                  <strong>{primaryValue(sort, player)}</strong>
                  <small>
                    {sort === "kd"
                      ? `${player.kills.toLocaleString()} kills`
                      : sort === "balance"
                        ? `K/D ${player.kdRatio.toFixed(2)}`
                        : player.balanceFormatted}
                  </small>
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
