import { AppSidebar } from "@/components/shell/AppSidebar";
import { PlayButton } from "@/components/ui/PlayButton";
import { homeContent } from "@/lib/home-content";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function ImageSlot({ label, variant = "default" }: { label: string; variant?: "default" | "plus" | "vote" | "creator" }) {
  return (
    <div className={`image-slot image-slot--${variant}`} aria-label={label}>
      <span className="image-slot__label">{label}</span>
      <span className="image-slot__grid" aria-hidden="true" />
    </div>
  );
}

function LeaderboardPreview() {
  const rows = [
    { label: "Top Player", sub: "Global", value: "—" },
    { label: "Top Team", sub: "Global", value: "—" },
    { label: "Best K/D", sub: "Global", value: "—" },
    { label: "Balance Top", sub: "Global", value: "—" },
  ];

  return (
    <article className="showcase-card leaderboard-card">
      <div className="showcase-card__heading">
        <div>
          <span className="card-eyebrow">Competitive</span>
          <h2>Leaderboards</h2>
        </div>
        <a className="icon-link" href="/leaderboards" aria-label="View leaderboards"><ArrowIcon /></a>
      </div>
      <div className="leaderboard-preview__rows">
        {rows.map((row, index) => (
          <div className="leaderboard-preview__row" key={row.label}>
            <span className="leaderboard-preview__rank">0{index + 1}</span>
            <span className="leaderboard-preview__name">
              <strong>{row.label}</strong>
              <small>{row.sub}</small>
            </span>
            <span className="leaderboard-preview__value">{row.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function PromoCard({
  eyebrow,
  title,
  body,
  imageLabel,
  href,
  variant,
}: {
  eyebrow: string;
  title: string;
  body: string;
  imageLabel: string;
  href: string;
  variant: "plus" | "vote" | "creator";
}) {
  return (
    <article className={`showcase-card promo-card promo-card--${variant}`}>
      <ImageSlot label={imageLabel} variant={variant} />
      <div className="promo-card__overlay" />
      <div className="promo-card__content">
        <span className="card-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        <a className="text-link" href={href}>
          Explore <ArrowIcon />
        </a>
      </div>
    </article>
  );
}

export function HomeWireframe() {
  return (
    <div className="mineacle-app">
      <AppSidebar />

      <div className="home-shell">
        <header className="home-topbar">
          <div className="home-topbar__context">
            <span className="status-light status-light--muted" aria-hidden="true" />
            <span>Mineacle SMP</span>
            <span className="topbar-divider" />
            <strong>{homeContent.season}</strong>
          </div>
          <div className="home-topbar__actions">
            <a href="#">How to join</a>
            <a className="topbar-login" href="/login">Log in</a>
          </div>
        </header>

        <main className="home-dashboard">
          <section className="hero-card">
            <ImageSlot label={homeContent.hero.imageLabel} />
            <div className="hero-card__shade" />
            <div className="hero-card__badge">
              <span className="status-light" aria-hidden="true" />
              Featured now
            </div>
            <div className="hero-card__content">
              <span className="hero-eyebrow">{homeContent.hero.eyebrow} · {homeContent.season}</span>
              <h1>{homeContent.hero.title}</h1>
              <p>{homeContent.hero.body}</p>
              <div className="hero-card__actions">
                <PlayButton address={homeContent.server.address} />
                <a className="ghost-button" href="#">How to join</a>
              </div>
            </div>
            <div className="hero-pagination" aria-label="Featured slide position">
              <span className="is-active" />
              <span />
              <span />
            </div>
          </section>

          <aside className="home-side-stack">
            <section className="side-card server-card">
              <div className="side-card__heading">
                <div>
                  <span className="card-eyebrow">Server</span>
                  <h2>{homeContent.server.statusLabel}</h2>
                </div>
                <span className="server-status-pill">
                  <span className="status-light status-light--muted" aria-hidden="true" />
                  API pending
                </span>
              </div>

              <div className="server-card__metric">
                <span>Players online</span>
                <strong>—</strong>
              </div>

              <div className="server-card__address">
                <div>
                  <small>Server address</small>
                  <strong>{homeContent.server.address}</strong>
                </div>
                <PlayButton address={homeContent.server.address} compact />
              </div>
            </section>

            <section className="side-card account-card">
              <div className="account-card__avatar" aria-hidden="true">
                <span />
              </div>
              <div className="account-card__copy">
                <span className="card-eyebrow">{homeContent.account.eyebrow}</span>
                <h2>{homeContent.account.title}</h2>
                <p>{homeContent.account.body}</p>
              </div>
              <div className="account-card__actions">
                <a className="secondary-button" href="/signup">Sign up</a>
                <a className="subtle-link" href="/login">Log in</a>
              </div>
            </section>
          </aside>

          <section className="home-showcase" aria-label="Mineacle highlights">
            <LeaderboardPreview />
            <PromoCard
              {...homeContent.mineaclePlus}
              href="#"
              variant="plus"
            />
            <PromoCard
              {...homeContent.voting}
              href="/vote"
              variant="vote"
            />
            <PromoCard
              {...homeContent.creator}
              href="#"
              variant="creator"
            />
          </section>
        </main>
      </div>
    </div>
  );
}
