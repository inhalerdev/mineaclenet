"use client";

import { useEffect, useState } from "react";
import block from "@/components/site/BlockButton.module.css";
import content from "@/components/site/ContentPage.module.css";
import type { VoteSite } from "@/features/vote/vote-sites";
import type { VoteStatus } from "@/features/vote/vote-status";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./VotePage.module.css";

/*
 * The vote site cards on /vote, for logged-in players.
 *
 * A site turns grey with "Voted" and a countdown once the Minecraft server
 * has received a vote from it (see features/vote/vote-status.ts). Clicking
 * "Vote now" only opens the site: the card waits and checks every few
 * seconds until the vote actually arrives, so just opening a link never
 * counts as a vote.
 */
const POLL_EVERY_MS = 8_000;
const POLL_FOR_MS = 5 * 60_000;

function timeLeft(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function VoteSites({
  sites,
  reward,
  initialVotes,
  serverNow,
}: {
  sites: VoteSite[];
  reward: string;
  initialVotes: VoteStatus;
  /* The server's clock when the page was made, so the first render
     matches on the server and in the browser. */
  serverNow: number;
}) {
  const [votes, setVotes] = useState<VoteStatus>(initialVotes);
  const [now, setNow] = useState(serverNow);
  // Site id -> when "Vote now" was clicked.
  const [waiting, setWaiting] = useState<Record<string, number>>({});

  const cooldownLeft = (site: VoteSite) => {
    const votedAt = votes[site.id];
    return votedAt ? votedAt + site.cooldownHours * 3_600_000 - now : 0;
  };

  const votedCount = sites.filter((site) => cooldownLeft(site) > 0).length;

  // Keep the countdowns fresh.
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // While a site is waiting for a vote, ask the server now and then.
  const waitingIds = Object.keys(waiting);

  useEffect(() => {
    if (!waitingIds.length) {
      return;
    }

    let stopped = false;

    async function check() {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const response = await fetch("/api/votes/status", { cache: "no-store" });

        if (!response.ok || stopped) {
          return;
        }

        const data = (await response.json()) as { votes?: VoteStatus };
        const latest = data.votes ?? {};
        const checkedAt = Date.now();

        setVotes(latest);
        setNow(checkedAt);
        setWaiting((current) => {
          const next: Record<string, number> = {};

          for (const [id, clickedAt] of Object.entries(current)) {
            const arrived = (latest[id] ?? 0) >= clickedAt - 60_000;
            const expired = checkedAt - clickedAt > POLL_FOR_MS;

            if (!arrived && !expired) {
              next[id] = clickedAt;
            }
          }

          return next;
        });
      } catch {
        // Try again on the next tick.
      }
    }

    const timer = window.setInterval(check, POLL_EVERY_MS);
    document.addEventListener("visibilitychange", check);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
    // Restart only when the set of waiting sites changes.
  }, [waitingIds.join(",")]);

  return (
    <div className={styles.sitesBlock}>
      <p className={styles.progress} aria-live="polite">
        <span className={styles.progressBar} aria-hidden="true">
          {sites.map((site, index) => (
            <i key={site.id} data-done={index < votedCount || undefined} />
          ))}
        </span>
        {votedCount === sites.length
          ? "All done for today. Come back when the timers run out."
          : `Voted on ${votedCount} of ${sites.length} sites today`}
      </p>

      <ol className={styles.sites} aria-label="Vote sites">
        {sites.map((site, index) => {
          const left = cooldownLeft(site);
          const voted = left > 0;
          const isWaiting = !voted && site.id in waiting;

          return (
            <li
              className={styles.site}
              key={site.id}
              data-voted={voted || undefined}
              data-waiting={isWaiting || undefined}
            >
              <span className={styles.siteNumber}>
                {voted ? <img src={mineacleIcons.check} alt="" /> : index + 1}
              </span>
              <div className={styles.siteName}>
                <strong>{site.name}</strong>
                <small>{site.domain}</small>
              </div>
              <p className={styles.siteReward}>
                <img src={mineacleIcons.key} alt="" />
                {voted ? `${reward} earned` : `+1 ${reward}`}
              </p>

              {voted ? (
                <span className={`${block.button} ${styles.voteButton} ${styles.voteDone}`}>
                  <span className={styles.votedLabel}>Voted</span>
                  <span className={styles.again}>Again in {timeLeft(left)}</span>
                </span>
              ) : (
                <a
                  className={`${block.button} ${block.green} ${styles.voteButton}`}
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWaiting((current) => ({ ...current, [site.id]: Date.now() }))}
                >
                  {isWaiting ? "Waiting for your vote..." : "Vote now"}
                  <span className={content.srOnly}> on {site.name} (opens in a new tab)</span>
                </a>
              )}

              {isWaiting ? (
                <p className={styles.waitingNote} role="status">
                  Finish voting on {site.name}. This ticks off by itself once the
                  site sends us your vote.
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
