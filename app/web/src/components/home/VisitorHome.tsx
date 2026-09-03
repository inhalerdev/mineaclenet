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
      <section className={styles.hero}>
        <video
          className={styles.video}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label={homeContent.hero.mediaLabel}
        >
          <source src={homeContent.hero.media} type="video/mp4" />
        </video>

        <div className={styles.scrim} aria-hidden="true" />

        <header className={styles.top}>
          <a className={styles.brand} href="/" aria-label="Mineacle home">
            <img
              src="/shared/images/branding/mineacle-logo.png"
              alt="Mineacle"
              draggable={false}
            />
          </a>

          <div className={styles.account}>
            <a className={styles.verifyLink} href="/login">
              Need to verify your account?
            </a>
            <a className={styles.signIn} href="/login">
              Sign in
            </a>
          </div>
        </header>

        <div className={styles.bottom}>
          <div className={styles.categoryStack}>
            <a className={styles.category} href="/leaderboards">
              <span className={styles.categoryImage}>
                <img
                  src="/images/home/leaderboards.jpg"
                  alt=""
                  draggable={false}
                />
              </span>
              <span className={styles.categoryCopy}>
                <small>Explore</small>
                <strong>Leaderboards</strong>
              </span>
            </a>

            <a className={styles.category} href="/punishments">
              <span
                className={`${styles.categoryImage} ${styles.punishmentImage}`}
              >
                <img
                  src="/shared/images/icons/streamline/core-solid/punishments.svg"
                  alt=""
                  draggable={false}
                />
              </span>
              <span className={styles.categoryCopy}>
                <small>Review</small>
                <strong>Punishments</strong>
              </span>
            </a>
          </div>

          <button
            className={`${styles.play} ${copied ? styles.playCopied : ""}`}
            type="button"
            onClick={copyServerAddress}
            aria-label={`Copy Mineacle server address: ${SERVER_ADDRESS}`}
          >
            <img
              src="/shared/images/icons/streamline/core-solid/play.svg"
              alt=""
              draggable={false}
            />
            <span>{copied ? "Copied" : "Play now"}</span>
          </button>

          <a className={styles.search} href="/leaderboards">
            <img
              src="/shared/images/icons/streamline/core-solid/search.svg"
              alt=""
              draggable={false}
            />
            <span>
              <small>Players</small>
              <strong>Search</strong>
            </span>
          </a>
        </div>

        <div className={styles.socials}>
          <a href="#" aria-label="Discord">
            <img
              src="/images/home/visitorhome/discord.png"
              alt=""
              draggable={false}
            />
          </a>

          <a href="#" aria-label="YouTube">
            <img
              src="/images/home/visitorhome/youtube.png"
              alt=""
              draggable={false}
            />
          </a>

          <a href="#" aria-label="X">
            <img
              src="/images/home/visitorhome/x.png"
              alt=""
              draggable={false}
            />
          </a>
        </div>
      </section>
    </main>
  );
}
