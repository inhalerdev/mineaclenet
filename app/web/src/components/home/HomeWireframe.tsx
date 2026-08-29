import { AppSidebar } from "@/components/shell/AppSidebar";
import { CopyAddressButton } from "@/components/ui/CopyAddressButton";
import { PlayButton } from "@/components/ui/PlayButton";
import { homeContent } from "@/lib/home-content";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

type PanelImageProps = {
  src: string;
  alt: string;
  variant: "hero" | "plus" | "rewards" | "competitive";
};

function PanelImage({ src, alt, variant }: PanelImageProps) {
  return (
    <div className={`mosaic-media mosaic-media--${variant}`}>
      {src ? <img alt={alt} src={src} /> : null}
      {!src ? (
        <div className="mosaic-media__placeholder" aria-label={alt}>
          <span>{alt}</span>
        </div>
      ) : null}
    </div>
  );
}

function FeatureLink({ label }: { label: string }) {
  return (
    <span className="mosaic-link">
      {label}
      <ArrowIcon />
    </span>
  );
}

function PromoPanel({
  variant,
  eyebrow,
  title,
  body,
  action,
  href,
  image,
  imageLabel,
}: {
  variant: "plus" | "rewards";
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  href: string;
  image: string;
  imageLabel: string;
}) {
  return (
    <a className={`mosaic-card mosaic-card--${variant}`} href={href}>
      <PanelImage alt={imageLabel} src={image} variant={variant} />
      <span className="mosaic-card__shade" aria-hidden="true" />
      <span className="mosaic-card__content mosaic-card__content--compact">
        <span className="mosaic-eyebrow">{eyebrow}</span>
        <strong className="mosaic-title mosaic-title--small">{title}</strong>
        <span className="mosaic-copy mosaic-copy--compact">{body}</span>
        <FeatureLink label={action} />
      </span>
    </a>
  );
}

export function HomeWireframe() {
  return (
    <div className="mineacle-app">
      <AppSidebar />

      <main className="home-mosaic" aria-label="Mineacle homepage">
        <section className="mosaic-card mosaic-card--hero">
          <PanelImage
            alt={homeContent.hero.imageLabel}
            src={homeContent.hero.image}
            variant="hero"
          />
          <span className="mosaic-card__shade mosaic-card__shade--hero" aria-hidden="true" />

          <div className="hero-status">
            <span className="status-light" aria-hidden="true" />
            <span>{homeContent.server.statusLabel}</span>
            {homeContent.server.playerCount ? (
              <>
                <span className="hero-status__divider" aria-hidden="true" />
                <strong>{homeContent.server.playerCount}</strong>
                <span>players</span>
              </>
            ) : null}
          </div>

          <div className="mosaic-card__content mosaic-card__content--hero">
            <span className="mosaic-eyebrow">
              {homeContent.hero.eyebrow}
              <span aria-hidden="true"> / </span>
              {homeContent.season}
            </span>
            <h1 className="mosaic-title mosaic-title--hero">{homeContent.hero.title}</h1>
            <p className="mosaic-copy">{homeContent.hero.body}</p>
            <div className="hero-actions">
              <PlayButton address={homeContent.server.address} />
              <button className="ghost-button" type="button">
                How to join
              </button>
            </div>
          </div>

          <CopyAddressButton address={homeContent.server.address} />
        </section>

        <PromoPanel {...homeContent.mineaclePlus} variant="plus" />
        <PromoPanel {...homeContent.rewards} variant="rewards" />

        <a className="mosaic-card mosaic-card--competitive" href={homeContent.competitive.href}>
          <PanelImage
            alt={homeContent.competitive.imageLabel}
            src={homeContent.competitive.image}
            variant="competitive"
          />
          <span className="mosaic-card__shade mosaic-card__shade--wide" aria-hidden="true" />

          <span className="mosaic-card__content mosaic-card__content--wide">
            <span className="mosaic-eyebrow">{homeContent.competitive.eyebrow}</span>
            <strong className="mosaic-title mosaic-title--wide">{homeContent.competitive.title}</strong>
            <span className="mosaic-copy mosaic-copy--wide">{homeContent.competitive.body}</span>
            <span className="competitive-categories" aria-label="Leaderboard categories">
              {homeContent.competitive.categories.map((category) => (
                <span key={category}>{category}</span>
              ))}
            </span>
            <FeatureLink label={homeContent.competitive.action} />
          </span>
        </a>
      </main>
    </div>
  );
}
