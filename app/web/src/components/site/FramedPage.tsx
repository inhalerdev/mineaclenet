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
 * Layout for inner pages (login, register, vote, ...): one full-height
 * framed box with the site header on top, the homepage video dimmed behind,
 * and a scrollable area for the page's own content.
 *
 *   align="center"  content sits in the middle (login panel)
 *   align="top"     content starts under the logo and scrolls (vote page)
 */
export function FramedPage({
  viewer = null,
  topPlayers,
  currentPath,
  align = "center",
  children,
}: {
  viewer?: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  currentPath: string;
  align?: "center" | "top";
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

        <main className={styles.stage} data-align={align}>
          {children}
        </main>
      </section>
    </div>
  );
}
