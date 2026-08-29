import { AppSidebar } from "@/components/shell/AppSidebar";
import { homeContent } from "@/features/home/home-content";

type PanelMediaProps = {
  src: string;
  alt: string;
  variant: "hero" | "plus" | "rewards" | "competitive";
};

function PanelMedia({ src, alt, variant }: PanelMediaProps) {
  const isVideo = src.toLowerCase().split("?")[0].endsWith(".mp4");

  return (
    <div className={`mosaic-media mosaic-media--${variant}`}>
      {src && isVideo ? (
        <video
          aria-label={alt}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : null}

      {src && !isVideo ? <img alt={alt} src={src} /> : null}

      {!src ? <div className="mosaic-media__placeholder" aria-label={alt} /> : null}
    </div>
  );
}

export function HomeWireframe() {
  return (
    <div className="mineacle-app">
      <AppSidebar />

      <main className="home-mosaic" aria-label="Mineacle homepage">
        <section className="mosaic-card mosaic-card--hero">
          <PanelMedia
            alt={homeContent.hero.mediaLabel}
            src={homeContent.hero.media}
            variant="hero"
          />
        </section>

        <section className="mosaic-card mosaic-card--plus">
          <PanelMedia
            alt={homeContent.mineaclePlus.mediaLabel}
            src={homeContent.mineaclePlus.media}
            variant="plus"
          />
        </section>

        <section className="mosaic-card mosaic-card--rewards">
          <PanelMedia
            alt={homeContent.rewards.mediaLabel}
            src={homeContent.rewards.media}
            variant="rewards"
          />
        </section>

        <section className="mosaic-card mosaic-card--competitive">
          <PanelMedia
            alt={homeContent.competitive.mediaLabel}
            src={homeContent.competitive.media}
            variant="competitive"
          />
        </section>
      </main>
    </div>
  );
}
