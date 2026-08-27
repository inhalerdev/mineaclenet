import type { PlayerPreview, TeamPreview } from "@/features/players/types";

type CompetitiveSectionProps = {
  players: PlayerPreview[];
  teams: TeamPreview[];
};

export function CompetitiveSection({ players, teams }: CompetitiveSectionProps) {
  return (
    <section className="competitive-section section-frame" aria-labelledby="competitive-title">
      <div className="section-heading">
        <span className="wire-kicker">Competitive pulse</span>
        <h2 id="competitive-title">Leaderboards and teams without leaving home</h2>
      </div>

      <div className="competitive-section__columns">
        <div className="ranking-block">
          <div className="ranking-block__heading">
            <strong>Players</strong>
            <span>Metric selector</span>
          </div>
          {players.map((player, index) => (
            <div className="ranking-row" key={`ranking-player-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span className="wire-avatar wire-avatar--small" aria-hidden="true" />
              <strong>{player.displayName}</strong>
              <span>{player.metricValue}</span>
            </div>
          ))}
        </div>

        <div className="ranking-block">
          <div className="ranking-block__heading">
            <strong>Teams</strong>
            <span>Metric selector</span>
          </div>
          {teams.map((team, index) => (
            <div className="ranking-row" key={`ranking-team-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span className="wire-team-mark" aria-hidden="true" />
              <strong>{team.name}</strong>
              <span>{team.metricValue}</span>
            </div>
          ))}
        </div>
      </div>

      <a className="wire-text-link" href="#">
        Open leaderboards →
      </a>
    </section>
  );
}
