import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthClient, type AuthMode } from "@/components/auth/AuthClient";
import { SiteHeader, type HomeLeaderboardPlayer } from "@/components/home/SiteHeader";
import homeStyles from "@/components/home/VisitorHome.module.css";
import frame from "@/components/site/SiteFrame.module.css";
import { getCurrentViewer } from "@/features/auth/session";
import { homeContent } from "@/features/home/home-content";
import { getPlayerLeaderboard } from "@/features/players/repository";
import styles from "./AccountPage.module.css";

/*
 * Log in (/login) and create account + in-game verify (/register).
 * Same frame, header and background video as the homepage, with the
 * account panel in the middle.
 */
export async function AccountPage({ mode }: { mode: AuthMode }) {
  const [viewer, leaderboard] = await Promise.all([
    getCurrentViewer(),
    getPlayerLeaderboard("balance", 3).catch(() => []),
  ]);

  if (viewer) {
    redirect("/");
  }

  const topPlayers = leaderboard.map((player) => ({
    uuid: player.uuid,
    username: player.username,
    displayName: player.displayName,
    online: player.online,
  }));

  return (
    <AccountShell mode={mode} topPlayers={topPlayers}>
      <AuthClient initialMode={mode} />
    </AccountShell>
  );
}

/* The page layout around the account panel. */
export function AccountShell({
  mode,
  topPlayers,
  children,
}: {
  mode: AuthMode;
  topPlayers: HomeLeaderboardPlayer[];
  children: ReactNode;
}) {
  return (
    <div className={`${frame.page} ${homeStyles.page} ${styles.page}`}>
      <section className={frame.heroFrame}>
        <SiteHeader
          viewer={null}
          topPlayers={topPlayers}
          currentPath={mode === "create" ? "/register" : "/login"}
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

        <main className={styles.stage}>{children}</main>
      </section>
    </div>
  );
}
