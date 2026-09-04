"use client";

import { useEffect, useState } from "react";
import { homeContent } from "@/features/home/home-content";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";

export function VisitorHome() {
  const [copied, setCopied] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    if (!joinOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setJoinOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [joinOpen]);

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
      <main className={styles.page}>
        <header className={styles.utilityBar}>
          <nav className={styles.accountActions} aria-label="Account">
            <a className={styles.verifyLink} href="/login?mode=create">
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

          <a
            className={styles.heroLogoLink}
            href="/"
            aria-label="Mineacle home"
          >
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
                onClick={() => setJoinOpen(true)}
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

        <section className={styles.cards} aria-label="Mineacle open beta">
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
              onClick={() => setJoinOpen(true)}
            >
              HOW TO JOIN <span>→</span>
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
              {copied ? "SERVER COPIED" : "PLAY & EXPLORE"} <span>→</span>
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

            <a
              className={styles.cardAction}
              href="/login?mode=create"
            >
              VERIFY YOUR PLAYER <span>→</span>
            </a>
          </article>
        </section>
      </main>

      {joinOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setJoinOpen(false);
            }
          }}
        >
          <section
            className={styles.joinModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-mineacle-title"
          >
            <button
              className={styles.modalClose}
              type="button"
              onClick={() => setJoinOpen(false)}
              aria-label="Close how to join"
            >
              ×
            </button>

            <header className={styles.modalHeader}>
              <span>HOW TO JOIN</span>
              <h2 id="join-mineacle-title">Join Mineacle</h2>
              <p>
                Mineacle is available on Minecraft: Java Edition. Add the
                server once and you can return whenever you want.
              </p>
            </header>

            <ol className={styles.joinSteps}>
              <li>
                <span>1</span>
                <div>
                  <strong>Open Minecraft: Java Edition</strong>
                  <p>Launch Minecraft and choose Multiplayer.</p>
                </div>
              </li>

              <li>
                <span>2</span>
                <div>
                  <strong>Add Mineacle</strong>
                  <p>Choose Add Server and enter the address below.</p>
                </div>
              </li>

              <li>
                <span>3</span>
                <div>
                  <strong>Join the world</strong>
                  <p>Select Mineacle from your server list and connect.</p>
                </div>
              </li>
            </ol>

            <div className={styles.serverAddress}>
              <div>
                <small>SERVER ADDRESS</small>
                <strong>{SERVER_ADDRESS}</strong>
              </div>

              <button
                type="button"
                onClick={copyServerAddress}
                className={copied ? styles.copySuccess : ""}
              >
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>

            <footer className={styles.modalFooter}>
              <span>Already joined Mineacle?</span>
              <a href="/login?mode=create">Verify your player →</a>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
