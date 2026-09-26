import type { LaunchStats } from "@/features/home/launch-stats";
import styles from "./LaunchTicker.module.css";

/*
 * Strip along the bottom of the homepage hero: a fixed PUBLIC BETA tag and
 * a slowly scrolling line of live server facts (IP, players online, money
 * in circulation, players joined, PvP kills, richest player).
 * Hovering pauses it; with "reduce motion" on it doesn't scroll at all.
 */

type LaunchTickerProps = {
  address: string;
  /** null while the first status check is running. */
  status: { online: boolean; currentlyPlaying: number } | null;
  stats: LaunchStats | null;
  richest?: { displayName: string; balance: string };
};

const whole = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function LaunchTicker({
  address,
  status,
  stats,
  richest,
}: LaunchTickerProps) {
  const items: { key: string; text: string; tone?: "online" | "offline" }[] = [
    { key: "ip", text: address },
    { key: "edition", text: "Java Edition" },
  ];

  if (status) {
    items.push(
      status.online
        ? {
            key: "online",
            text: `${whole.format(status.currentlyPlaying)} online`,
            tone: "online",
          }
        : { key: "online", text: "Server offline", tone: "offline" },
    );
  }

  if (stats && stats.balanceCents > 0) {
    items.push({
      key: "money",
      text: `${money.format(stats.balanceCents / 100)} in circulation`,
    });
  }

  if (stats && stats.players > 0) {
    items.push({
      key: "players",
      text: `${whole.format(stats.players)} players joined`,
    });
  }

  if (stats && stats.kills > 0) {
    items.push({ key: "kills", text: `${whole.format(stats.kills)} PvP kills` });
  }

  if (richest) {
    items.push({
      key: "richest",
      text: `Richest: ${richest.displayName} (${richest.balance})`,
    });
  }

  const list = (copy: boolean) => (
    <ul className={styles.list} aria-hidden={copy || undefined}>
      {items.map((item) => (
        <li key={item.key} data-tone={item.tone}>
          {item.text}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.ticker}>
      <span className={styles.tag}>Public Beta</span>

      <div
        className={styles.viewport}
        role="marquee"
        aria-label="Live server stats"
      >
        {/* The line is written twice so it can scroll in a seamless loop. */}
        <div
          className={styles.track}
          style={{ animationDuration: `${Math.max(20, items.length * 6)}s` }}
        >
          {list(false)}
          {list(true)}
        </div>
      </div>
    </div>
  );
}
