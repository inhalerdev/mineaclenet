import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import block from "@/components/site/BlockButton.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import { voteReward, voteSites } from "@/features/vote/vote-sites";
import { mineacleIcons, mineacleNavIcons } from "@/shared/icons/mineacle-icons";
import styles from "./VotePage.module.css";

/*
 * Vote & Rewards (/vote): intro with the daily numbers, one card per vote
 * site (from features/vote/vote-sites.ts), then how the keys work.
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
      <div className={styles.vote}>
        <header className={styles.intro}>
          <span className={styles.tag}>Vote &amp; Rewards</span>
          <h1>Vote for Mineacle</h1>
          <p>
            Vote on all {voteSites.length} sites every day. Each vote gives you
            a <b>{voteReward}</b> in-game.
          </p>

          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Vote sites</dt>
              <dd>{voteSites.length}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Keys per day</dt>
              <dd>
                <img src={mineacleIcons.crate} alt="" />
                Up to {voteSites.length}
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>{viewer ? "Voting as" : "Vote with"}</dt>
              <dd>
                {viewer ? (
                  <>
                    <img
                      src={playerAvatarUrl(viewer.uuid, 40)}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <span>{viewer.username}</span>
                  </>
                ) : (
                  <span>Your name</span>
                )}
              </dd>
            </div>
          </dl>
        </header>

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
                <span className={styles.srOnly}> on {site.name} (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ol>

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
