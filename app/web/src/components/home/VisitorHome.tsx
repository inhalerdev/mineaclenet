import { homeContent } from "@/features/home/home-content";

export function VisitorHome() {
  return (
    <main className="visitor-home">
      <section className="visitor-hero">
        <video autoPlay loop muted playsInline preload="auto">
          <source src={homeContent.hero.media} type="video/mp4" />
        </video>
        <div className="visitor-hero__shade" />

        <div className="visitor-hero__top">
          <span>Mineacle SMP</span>
          <a href="/login">Player login</a>
        </div>

        <div className="visitor-hero__copy">
          <small>PLAY. TRADE. COMPETE.</small>
          <h1>Your place in Mineacle starts here.</h1>
          <p>
            A persistent Minecraft SMP built around players, teams,
            economy and competition.
          </p>

          <div className="visitor-actions">
            <a className="is-primary" href="/leaderboards">
              Explore leaderboards <span>→</span>
            </a>
            <a href="https://store.mineacle.net/">
              Visit the store <span>→</span>
            </a>
          </div>

          <p className="visitor-login-prompt">
            Already play on Mineacle?
            <a href="/login">Verify your player account</a>
          </p>
        </div>

        <div className="visitor-preview-cards">
          <a href="/leaderboards">
            <img src={homeContent.competitive.media} alt="" />
            <span className="preview-shade" />
            <span className="preview-copy">
              <small>COMPETE</small>
              <strong>Leaderboards</strong>
            </span>
          </a>

          <a href="https://store.mineacle.net/">
            <img src={homeContent.mineaclePlus.media} alt="" />
            <span className="preview-shade" />
            <span className="preview-copy">
              <small>SUPPORT MINEACLE</small>
              <strong>Mineacle+</strong>
            </span>
          </a>
        </div>
      </section>
    </main>
  );
}
