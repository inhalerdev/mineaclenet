import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import block from "@/components/site/BlockButton.module.css";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro, StatTile } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import { voteReward, voteSites } from "@/features/vote/vote-sites";
import type { VoteStatus } from "@/features/vote/vote-status";
import { mineacleIcons, mineacleNavIcons } from "@/shared/icons/mineacle-icons";
import { withReturnPath } from "@/shared/navigation/return-path";
import styles from "./VotePage.module.css";
import { VoteSites } from "./VoteSites";

/*
 * Vote & Rewards (/vote): intro with the daily numbers, one card per vote
 * site (from features/vote/vote-sites.ts), then how the keys work.
 * Logged-out visitors get a "Log in to vote" box instead of the sites.
 * The cards themselves (with voted / cooldown state) are VoteSites.tsx.
 */
export function VotePage({
  viewer,
  topPlayers,
  voteStatus = null,
  serverNow,
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  /* The viewer's recent votes per site (null when unknown). */
  voteStatus?: VoteStatus | null;
  serverNow: number;
}) {
  const steps = [
    {
      icon: mineacleNavIcons.vote,
      title: "Vote on each site",
      text: "Enter your Minecraft username. Sites you've voted on turn grey until you can vote again.",
    },
    {
      icon: mineacleIcons.key,
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
          tone="blue"
          title="Vote for Mineacle"
          footer={
            <dl className={content.stats}>
              <StatTile label="Vote sites">{voteSites.length}</StatTile>
              <StatTile label="Keys per day">
                <img src={mineacleIcons.key} alt="" />
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
          <VoteSites
            sites={voteSites}
            reward={voteReward}
            initialVotes={voteStatus ?? {}}
            serverNow={serverNow}
          />
        ) : (
          <section className={styles.locked} aria-labelledby="vote-login">
            <img src={mineacleIcons.key} alt="" />
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
