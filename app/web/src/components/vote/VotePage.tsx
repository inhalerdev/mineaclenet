import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import block from "@/components/site/BlockButton.module.css";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro, StatTile } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import { voteReward, voteSites } from "@/features/vote/vote-sites";
import { mineacleIcons, mineacleNavIcons } from "@/shared/icons/mineacle-icons";
import { withReturnPath } from "@/shared/navigation/return-path";
import styles from "./VotePage.module.css";

/*
 * Vote & Rewards (/vote): intro with the daily numbers, one card per vote
 * site (from features/vote/vote-sites.ts), then how the keys work.
 * Logged-out visitors get a "Log in to vote" box instead of the sites.
 */
export function VotePage({
  viewer,
  topPlayers,
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
}) {
  const steps = [
    {
      icon: mineacleNavIcons.vote,
      title: "Vote on each site",
      text: "Enter your Minecraft username. Each site lets you vote about once a day.",
    },
    {
      icon: mineacleIcons.crate,
      title: `Get a ${voteReward}`,
      text: "Every vote on every site sends one key to you in-game.",
    },
    {
      icon: mineacleIcons.gift,
      title: "Open the Vote Crate",
      text: "Use a key at the Vote Crate in-game. One key, one reward.",
    },
  ];

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/vote"
      variant="content"
    >
      <div className={content.content}>
        <PageIntro
          tag="Vote & Rewards"
          title="Vote for Mineacle"
          footer={
            <dl className={content.stats}>
              <StatTile label="Vote sites">{voteSites.length}</StatTile>
              <StatTile label="Keys per day">
                <img src={mineacleIcons.crate} alt="" />
                Up to {voteSites.length}
              </StatTile>
              {viewer ? (
                <StatTile label="Voting as">
                  <img
                    src={playerAvatarUrl(viewer.uuid, 40)}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <span>{viewer.username}</span>
                </StatTile>
              ) : null}
            </dl>
          }
        >
          Vote on all {voteSites.length} sites every day. Each vote gives you
          a <b>{voteReward}</b> in-game.
        </PageIntro>

        {viewer ? (
          <ol className={styles.sites} aria-label="Vote sites">
            {voteSites.map((site, index) => (
              <li className={styles.site} key={site.id}>
                <span className={styles.siteNumber}>{index + 1}</span>
                <div className={styles.siteName}>
                  <strong>{site.name}</strong>
                  <small>{site.domain}</small>
                </div>
                <p className={styles.siteReward}>
                  <img src={mineacleIcons.crate} alt="" />
                  +1 {voteReward}
                </p>
                <a
                  className={`${block.button} ${block.green} ${styles.voteButton}`}
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Vote now
                  <span className={content.srOnly}> on {site.name} (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <section className={styles.locked} aria-labelledby="vote-login">
            <img src={mineacleIcons.crate} alt="" />
            <div>
              <h2 id="vote-login">Log in to vote</h2>
              <p>
                Your {voteReward}s go to the Minecraft account linked to your
                Mineacle login, so log in first to see the vote sites.
              </p>
            </div>
            <div className={styles.lockedActions}>
              <a
                className={`${block.button} ${block.primary}`}
                href={withReturnPath("/login", "/vote")}
              >
                Log in
              </a>
              <a className={block.button} href={withReturnPath("/register", "/vote")}>
                Create account
              </a>
            </div>
          </section>
        )}

        <section className={styles.how} aria-labelledby="vote-how">
          <h2 id="vote-how">How it works</h2>
          <ol className={styles.steps}>
            {steps.map((step) => (
              <li className={styles.step} key={step.title}>
                <img src={step.icon} alt="" />
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </FramedPage>
  );
}
