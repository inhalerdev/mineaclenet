import type { PlayerPreview } from "@/features/players/types";

type PlayerDiscoverySectionProps = {
  players: PlayerPreview[];
};

export function PlayerDiscoverySection({ players }: PlayerDiscoverySectionProps) {
  return (
    <section className="discovery-section section-frame" aria-labelledby="discover-title">
      <div className="section-heading section-heading--row">
        <div>
          <span className="wire-kicker">Discover</span>
          <h2 id="discover-title">Players are a primary navigation surface</h2>
        </div>
        <form className="section-search" role="search">
          <label className="sr-only" htmlFor="home-player-search">
            Find a Mineacle player
          </label>
          <input id="home-player-search" placeholder="Find a player" type="search" />
        </form>
      </div>

      <div className="player-list" aria-label="Featured player placeholders">
        {players.map((player, index) => (
          <a className="player-row" href="#" key={`${player.username}-${index}`}>
            <span className="wire-avatar" aria-hidden="true" />
            <span className="player-row__identity">
              <strong>{player.displayName}</strong>
              <span>{player.username}</span>
            </span>
            <span className="player-row__rank">{player.rankLabel ?? "Rank"}</span>
            <span className="player-row__metric">
              <small>{player.metricLabel}</small>
              <strong>{player.metricValue}</strong>
            </span>
            <span aria-hidden="true">→</span>
          </a>
        ))}
      </div>

      <a className="wire-text-link" href="#">
        Browse players →
      </a>
    </section>
  );
}
