import { SessionsCard, PasswordCard } from "@/components/account/AccountSecurity";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import block from "@/components/site/BlockButton.module.css";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { StatTile } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import type { PlayerProfile } from "@/features/players/types";
import styles from "./AccountSettings.module.css";

/*
 * Your account (/profile): who you're logged in as, quick links to your
 * public profile, following and notifications, then password and session
 * settings. Only you can see this page. Data is loaded by app/profile/page.tsx.
 */
export function AccountSettingsPage({
  viewer,
  topPlayers,
  player,
  sessionCount,
}: {
  viewer: Viewer;
  topPlayers: HomeLeaderboardPlayer[];
  player: PlayerProfile | null;
  sessionCount: number;
}) {
  const publicHref = `/player/${encodeURIComponent(viewer.username)}`;

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/profile"
      variant="content"
    >
      <div className={content.content}>
        <header className={styles.header}>
          <img
            className={styles.head}
            src={playerAvatarUrl(viewer.uuid, 128)}
            alt=""
            referrerPolicy="no-referrer"
          />

          <div className={styles.identity}>
            <span className={content.tag} data-tone="purple">
              Your account
            </span>
            <h1>{viewer.username}</h1>
            <p>Your website account is linked to this Minecraft account.</p>
          </div>

          <div className={styles.actions}>
            <a className={block.button} href={publicHref}>
              Public profile
            </a>
            <LogoutButton />
          </div>
        </header>

        <div className={`${content.stats} ${styles.stats}`}>
          <a className={styles.statLink} href="/following">
            <dl>
              <StatTile label="Following">{viewer.followingCount.toLocaleString("en-US")}</StatTile>
            </dl>
          </a>
          <a className={styles.statLink} href="/notifications">
            <dl>
              <StatTile label="New alerts">
                {viewer.unreadNotifications.toLocaleString("en-US")}
              </StatTile>
            </dl>
          </a>
          <a className={styles.statLink} href="/leaderboards">
            <dl>
              <StatTile label="Balance">{player?.balanceFormatted || "–"}</StatTile>
            </dl>
          </a>
        </div>

        <div className={styles.grid}>
          <PasswordCard />

          <div className={styles.side}>
            <SessionsCard sessionCount={sessionCount} />

            <section className={styles.card} aria-labelledby="account-details">
              <h2 id="account-details">Linked Minecraft account</h2>
              <dl className={styles.details}>
                <div>
                  <dt>Username</dt>
                  <dd>{viewer.username}</dd>
                </div>
                <div>
                  <dt>UUID</dt>
                  <dd className={styles.uuid}>{viewer.uuid}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </FramedPage>
  );
}
