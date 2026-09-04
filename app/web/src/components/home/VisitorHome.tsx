"use client";

import { useEffect, useState } from "react";
import { homeContent } from "@/features/home/home-content";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";

export function VisitorHome() {
  const [copied, setCopied] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 820);
    return () => window.clearTimeout(timer);
  }, []);

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
    <>
      {showLoader ? (
        <div className={styles.loader} aria-label="Loading Mineacle">
          <img
            className={styles.loaderLogo}
            src="/shared/images/branding/mineacle-logo.png"
            alt="Mineacle"
            draggable={false}
          />
        </div>
      ) : null}

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
                Paragraph text or labels or a mixture of both with features
                included in the open public beta fill this in with information.
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

        <section className={styles.cards} aria-label="Mineacle features">
          <article className={styles.card} />
          <article className={styles.card} />
          <article className={styles.card} />
          <article className={styles.card} />
        </section>
      </main>
    </>
  );
}
