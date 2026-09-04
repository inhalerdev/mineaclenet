"use client";

import { useState } from "react";
import { homeContent } from "@/features/home/home-content";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";

export function VisitorHome() {
  const [copied, setCopied] = useState(false);

  async function copyServerAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.utilityBar}>
        <nav className={styles.accountActions} aria-label="Account">
          <a className={styles.verifyLink} href="/login">
            Verify in-game account
          </a>
          <a className={styles.loginButton} href="/login">
            Login
          </a>
        </nav>
      </header>

      <section className={styles.hero} aria-label="Mineacle open beta">
        <video
          className={styles.heroVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label={homeContent.hero.mediaLabel}
        >
          <source src={homeContent.hero.media} type="video/mp4" />
        </video>

        <div className={styles.heroShade} aria-hidden="true" />

        <a className={styles.heroLogoLink} href="/" aria-label="Mineacle home">
          <img
            className={styles.heroLogo}
            src="/shared/images/branding/mineacle-logo.png"
            alt="Mineacle"
            draggable={false}
          />
        </a>

        <div className={styles.heroFooter}>
          <div className={styles.heroCopy}>
            <h1>
              MINEACLE <span>OPEN BETA</span>
            </h1>
            <p>
              The world is open. Build your name, grow your wealth, compete
              with other players, and be part of Mineacle before the full
              release.
            </p>
          </div>

          <div className={styles.playGroup}>
            <button
              className={styles.joinGuide}
              type="button"
              onClick={copyServerAddress}
            >
              How to join mineacle.net
            </button>

            <button
              className={`${styles.playButton} ${
                copied ? styles.playButtonCopied : ""
              }`}
              type="button"
              onClick={copyServerAddress}
              aria-label={`Copy Mineacle server address: ${SERVER_ADDRESS}`}
            >
              {copied ? "COPIED" : "PLAY"}
            </button>
          </div>

          <div aria-hidden="true" />
        </div>
      </section>

      <section className={styles.cards} aria-label="Mineacle open beta features">
        <article className={styles.card}>
          <div className={styles.cardBody}>
            <span className={styles.cardEyebrow}>OPEN BETA</span>
            <h2>Play Mineacle now</h2>
            <p>
              Mineacle is live and playable during development. Join early,
              explore the current systems, and help define what the server
              becomes.
            </p>
          </div>

          <button
            className={styles.cardAction}
            type="button"
            onClick={copyServerAddress}
          >
            {copied ? "SERVER COPIED" : "JOIN MINEACLE"} <span>→</span>
          </button>
        </article>

        <article className={styles.card}>
          <div className={styles.cardBody}>
            <span className={styles.cardEyebrow}>COMPETE</span>
            <h2>Make your name known</h2>
            <p>
              Track your stats, climb the leaderboards, build your team, and
              compete against players across Mineacle.
            </p>
          </div>

          <a className={styles.cardAction} href="/leaderboards">
            VIEW LEADERBOARDS <span>→</span>
          </a>
        </article>

        <article className={styles.card}>
          <div className={styles.cardBody}>
            <span className={styles.cardEyebrow}>ECONOMY</span>
            <h2>Build something valuable</h2>
            <p>
              Earn, trade, sell, and grow your place in a player-driven world
              where progress means more than just what you carry.
            </p>
          </div>

          <button
            className={styles.cardAction}
            type="button"
            onClick={copyServerAddress}
          >
            PLAY &amp; EXPLORE <span>→</span>
          </button>
        </article>

        <article className={styles.card}>
          <div className={styles.cardBody}>
            <span className={styles.cardEyebrow}>IN DEVELOPMENT</span>
            <h2>You are early</h2>
            <p>
              Open Beta is where Mineacle gets refined. Systems, balancing,
              content, and the website will keep evolving as we move toward
              release.
            </p>
          </div>

          <button
            className={styles.cardAction}
            type="button"
            onClick={copyServerAddress}
          >
            JOIN EARLY <span>→</span>
          </button>
        </article>
      </section>
    </main>
  );
}
