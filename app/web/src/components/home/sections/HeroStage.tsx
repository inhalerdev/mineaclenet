import type { ServerSummary } from "@/features/server/types";

type HeroStageProps = {
  server: ServerSummary;
};

export function HeroStage({ server }: HeroStageProps) {
  return (
    <section className="hero-stage" aria-labelledby="home-hero-title">
      <div className="hero-stage__visual wire-media">
        <span>Primary world / cinematic media</span>
      </div>

      <div className="hero-stage__content">
        <span className="wire-kicker">Identity / season / world context</span>
        <h1 id="home-hero-title">Primary Mineacle statement goes here</h1>
        <p className="wire-copy wire-copy--wide">
          Short supporting statement. Final copy and narrative are intentionally
          not defined in the wireframe.
        </p>

        <div className="wire-actions">
          <a className="wire-button" href="#">
            Primary action
          </a>
          <a className="wire-button wire-button--secondary" href="#">
            Secondary action
          </a>
        </div>
      </div>

      <aside className="hero-stage__utility" aria-label="Live Mineacle summary">
        <div className="wire-panel wire-panel--flush">
          <span className="wire-kicker">Live server</span>
          <strong className="wire-value">
            {server.onlinePlayers ?? "—"}
            {server.maxPlayers === null ? "" : ` / ${server.maxPlayers}`}
          </strong>
          <span className="wire-muted">Players online</span>
        </div>

        <div className="wire-rule" />

        <div className="wire-panel wire-panel--flush">
          <span className="wire-kicker">Your Mineacle</span>
          <strong>Signed-out state</strong>
          <p className="wire-muted">
            This becomes the player utility surface when authenticated.
          </p>
          <a className="wire-text-link" href="#">
            Claim player / sign in →
          </a>
        </div>
      </aside>
    </section>
  );
}
