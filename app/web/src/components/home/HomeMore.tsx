import type { CSSProperties } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { homeContent } from "@/features/home/home-content";
import { mineacleIcons, mineacleStatIcons } from "@/shared/icons/mineacle-icons";
import styles from "./HomeMore.module.css";

/*
 * Below the homepage's first screen (hero + quick cards), Minecraft.net
 * style: what's on the server as four feature blocks, how to join in three
 * steps, then the site footer. Text lives here; colors in app/tokens.css.
 */
const FEATURES = [
  {
    icon: mineacleStatIcons.kills,
    color: "#ff5c5c",
    title: "1.8 PvP, done right",
    text: "No attack cooldown, 1.8 knockback and crits, plus crystal and mace fights on modern 1.21.",
    link: { label: "Top fighters", href: "/leaderboards?sort=kills" },
  },
  {
    icon: mineacleStatIcons.balance,
    color: "var(--mc-stat-money)",
    title: "A player-run economy",
    text: "Sell your haul, run the market and outbid rivals at the auction house. Every coin is earned in game.",
    link: { label: "Richest players", href: "/leaderboards" },
  },
  {
    icon: mineacleStatIcons.kd,
    color: "var(--mc-purple-face)",
    title: "Teams and bounties",
    text: "Build a team, share homes and put a price on a rival's head. Claim a bounty to cash it in.",
    link: { label: "Best K/D", href: "/leaderboards?sort=kd" },
  },
  {
    icon: mineacleIcons.key,
    color: "var(--mc-stat-playtime)",
    title: "Free keys every day",
    text: "Vote daily for free keys that restock your gear. Wardens and Dragons crates let you pick your reward, no gambling.",
    link: { label: "Vote for keys", href: "/vote" },
  },
];

export function HomeMore() {
  const { address, javaVersion } = homeContent.join;

  return (
    <div className={styles.more}>
      <section className={styles.section} aria-labelledby="home-features">
        <header className={styles.heading}>
          <span className={styles.tag}>What&apos;s on Mineacle</span>
          <h2 id="home-features">Play to win. Build to last.</h2>
          <p>Everything you&apos;d want from a survival server, tuned for players who like a fight.</p>
        </header>

        <ul className={styles.features}>
          {FEATURES.map((feature) => (
            <li key={feature.title} className={styles.feature} style={{ "--accent": feature.color } as CSSProperties}>
              <span className={styles.featureIcon}>
                <img src={feature.icon} alt="" />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <a href={feature.link.href}>{feature.link.label} ›</a>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="home-join">
        <header className={styles.heading}>
          <span className={styles.tag} data-tone="green">How to join</span>
          <h2 id="home-join">In game in under a minute</h2>
        </header>

        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNumber}>1</span>
            <h3>Open Multiplayer</h3>
            <p>
              Launch Minecraft: Java Edition{javaVersion ? ` ${javaVersion}` : ""} and
              choose <b>Multiplayer</b>.
            </p>
          </li>
          <li>
            <span className={styles.stepNumber}>2</span>
            <h3>Add the server</h3>
            <p>
              Click <b>Add Server</b> and enter <code>{address}</code> as the address.
            </p>
          </li>
          <li>
            <span className={styles.stepNumber}>3</span>
            <h3>Join and grab free keys</h3>
            <p>
              Hop in, then <a href="/vote">vote</a> for your first free crate keys.
            </p>
          </li>
        </ol>
      </section>

      <SiteFooter />
    </div>
  );
}
