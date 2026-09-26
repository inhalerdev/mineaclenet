import type { ReactNode } from "react";
import {
  SiteHeader,
  type HomeLeaderboardPlayer,
} from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import { homeContent } from "@/features/home/home-content";
import frame from "./SiteFrame.module.css";
import styles from "./FramedPage.module.css";

/*
 * Layout for inner pages: one full-height framed box with the site header
 * on top and a scrollable area for the page's own content.
 *
 *   variant="panel"    homepage video dimmed behind, one panel in the
 *                      middle (login, register)
 *   variant="content"  plain dark background; content starts under the
 *                      logo at the same left edge as the homepage hero
 *                      text and runs the full width (vote, bans)
 */
export function FramedPage({
  viewer = null,
  topPlayers,
  currentPath,
  variant = "panel",
  children,
}: {
  viewer?: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  currentPath: string;
  variant?: "panel" | "content";
  children: ReactNode;
}) {
  return (
    <div className={`${frame.page} ${styles.page}`}>
      <section className={frame.heroFrame}>
        <SiteHeader
          viewer={viewer}
          topPlayers={topPlayers}
          currentPath={currentPath}
        />

        {variant === "panel" ? (
          <div className={frame.hero} aria-hidden="true">
            <video
              className={frame.heroVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              poster={homeContent.hero.poster || undefined}
            >
              <source src={homeContent.hero.media} type="video/mp4" />
            </video>
            <div className={`${frame.heroShade} ${styles.shade}`} />
          </div>
        ) : (
          <div className={`${frame.hero} ${styles.plain}`} aria-hidden="true" />
        )}

        <main className={styles.stage} data-variant={variant}>
          {children}
        </main>
      </section>
    </div>
  );
}
