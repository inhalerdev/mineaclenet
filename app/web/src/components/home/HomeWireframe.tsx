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

function ImageSlot({ label, variant = "default" }: { label: string; variant?: "default" | "plus" | "rewards" }) {
  return (
    <div className={`image-slot image-slot--${variant}`} aria-label={label}>
      <span className="image-slot__label">{label}</span>
      <span className="image-slot__grid" aria-hidden="true" />
    </div>
  );
}

function LeaderboardPreview() {
  const rows = [
    { label: "Top Player", meta: "Global", value: "—" },
    { label: "Top Team", meta: "Global", value: "—" },
    { label: "Best K/D", meta: "Global", value: "—" },
  ];

  return (
    <article className="highlight-card leaderboard-card">
      <div className="highlight-card__head">
        <div>
          <span className="card-eyebrow">Global</span>
          <h2>Leaderboards</h2>
        </div>
        <a className="round-link" href="/leaderboards" aria-label="View leaderboards"><ArrowIcon /></a>
      </div>
      <div className="leaderboard-list">
        {rows.map((row, index) => (
          <div className="leaderboard-row" key={row.label}>
            <span className="leaderboard-rank">0{index + 1}</span>
            <div>
              <strong>{row.label}</strong>
              <small>{row.meta}</small>
            </div>
            <span className="leaderboard-value">{row.value}</span>
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
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  imageLabel: string;
  href: string;
  variant: "plus" | "rewards";
  action: string;
}) {
  return (
    <article className={`highlight-card promo-card promo-card--${variant}`}>
      <ImageSlot label={imageLabel} variant={variant} />
      <div className="promo-card__shade" />
      <div className="promo-card__content">
        <span className="card-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        <a className="text-link" href={href}>{action}<ArrowIcon /></a>
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
            <span className="status-light" aria-hidden="true" />
            <strong>Mineacle SMP</strong>
            <span className="topbar-muted">{homeContent.season}</span>
          </div>
          <div className="home-topbar__actions">
            <a href="#">How to join</a>
            <span className="topbar-status">Online <strong>—</strong></span>
            <a className="topbar-login" href="/login">Account</a>
          </div>
        </header>

        <main className="home-dashboard">
          <section className="hero-card">
            <ImageSlot label={homeContent.hero.imageLabel} />
            <div className="hero-card__shade" />

            <div className="hero-card__meta">
              <span>{homeContent.hero.eyebrow}</span>
              <span className="hero-meta-divider" />
              <strong>{homeContent.season}</strong>
            </div>

            <div className="hero-card__content">
              <h1>{homeContent.hero.title}</h1>
              <p>{homeContent.hero.body}</p>
              <div className="hero-card__actions">
                <PlayButton address={homeContent.server.address} />
                <a className="ghost-button" href="#">How to join</a>
              </div>
            </div>

            <div className="hero-card__server">
              <span className="status-light" aria-hidden="true" />
              <div>
                <small>Server address</small>
                <strong>{homeContent.server.address}</strong>
              </div>
            </div>

            <div className="hero-pagination" aria-label="Featured content">
              {homeContent.hero.slides.map((slide, index) => (
                <button className={index === 0 ? "is-active" : ""} key={slide} type="button" aria-label={`Show ${slide} feature`} />
              ))}
            </div>
          </section>

          <section className="home-highlights" aria-label="Mineacle highlights">
            <LeaderboardPreview />
            <PromoCard
              {...homeContent.mineaclePlus}
              action="Explore Mineacle+"
              href="#"
              variant="plus"
            />
            <PromoCard
              {...homeContent.rewards}
              action="Earn keys"
              href="/vote"
              variant="rewards"
            />
          </section>
        </main>
      </div>
    </div>
  );
}
