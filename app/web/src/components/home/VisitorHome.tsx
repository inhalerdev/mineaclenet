"use client";

import { useEffect, useState } from "react";
import { AuthClient } from "@/components/auth/AuthClient";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import { homeContent } from "@/features/home/home-content";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";
const ICON_ROOT =
  "/shared/images/icons/streamline/core-solid";
const JAVA_EDITION_ICON =
  "/images/home/visitorhome/edition-java.png";
const BEDROCK_EDITION_ICON =
  "/images/home/visitorhome/edition-bedrock.png";

type AuthMode = "login" | "create";
type AuthStage = "edition" | "form";

export function VisitorHome() {
  const [copied, setCopied] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authStage, setAuthStage] =
    useState<AuthStage>("edition");

  const modalOpen = joinOpen || authMode !== null;

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setJoinOpen(false);
        setAuthMode(null);
        setAuthStage("edition");
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen]);

  async function copyServerAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  function openAuth(mode: AuthMode) {
    setJoinOpen(false);
    setAuthMode(mode);
    setAuthStage("edition");
  }

  function closeAuth() {
    setAuthMode(null);
    setAuthStage("edition");
  }

  async function finishPlayerAuthentication() {
    try {
      await fetch("/api/admin/preview/exit", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });
    } catch {
      // Normal public visitors may not have a preview cookie.
    }

    window.location.replace("/");
  }

  return (
    <>
      <main className={styles.page}>
        <header className={styles.utilityBar}>
          <PlayerSearch className={styles.playerSearch} />

          <nav
            className={styles.accountActions}
            aria-label="Account"
          >
            <button
              className={styles.verifyLink}
              type="button"
              onClick={() => openAuth("create")}
            >
              Verify in-game account
            </button>

            <button
              className={styles.loginButton}
              type="button"
              onClick={() => openAuth("login")}
            >
              Login
            </button>
          </nav>
        </header>

        <section
          className={styles.hero}
          aria-label="Mineacle open beta"
        >
          <video
            className={styles.heroVideo}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label={homeContent.hero.mediaLabel}
          >
            <source
              src={homeContent.hero.media}
              type="video/mp4"
            />
          </video>

          <div
            className={styles.heroShade}
            aria-hidden="true"
          />

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
              <div className={styles.betaStatus}>
                <span aria-hidden="true" />
                OPEN BETA LIVE
              </div>

              <h1>
                MINEACLE <span>OPEN BETA</span>
              </h1>

              <p>
                Build your name, grow your wealth, compete
                with others, and be part of Mineacle before
                full release.
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

        <section
          className={styles.cards}
          aria-label="Explore Mineacle"
        >
          <a
            className={styles.mediaCard}
            href="/leaderboards"
          >
            <span className={styles.cardMedia}>
              <img
                src={homeContent.competitive.media}
                alt=""
                draggable={false}
              />
            </span>
            <span className={styles.mediaShade} />

            <span className={styles.cardContent}>
              <small>COMPETE</small>
              <strong>Leaderboards</strong>
              <span>
                See the players and teams leading Mineacle.
              </span>
              <b>VIEW LEADERBOARDS →</b>
            </span>
          </a>

          <a className={styles.mediaCard} href="/vote">
            <span
              className={`${styles.cardMedia} ${styles.mediaFallback}`}
            >
              <img
                className={styles.fallbackIcon}
                src={`${ICON_ROOT}/rewards.svg`}
                alt=""
                draggable={false}
              />
            </span>
            <span className={styles.mediaShade} />

            <span className={styles.cardContent}>
              <small>REWARDS</small>
              <strong>Vote for Mineacle</strong>
              <span>
                Support the server and collect voting rewards.
              </span>
              <b>VIEW REWARDS →</b>
            </span>
          </a>

          <a
            className={styles.mediaCard}
            href="/punishments"
          >
            <span
              className={`${styles.cardMedia} ${styles.mediaFallback}`}
            >
              <img
                className={styles.fallbackIcon}
                src={`${ICON_ROOT}/punishments.svg`}
                alt=""
                draggable={false}
              />
            </span>
            <span className={styles.mediaShade} />

            <span className={styles.cardContent}>
              <small>PUBLIC RECORDS</small>
              <strong>Punishments</strong>
              <span>
                Review public bans and player history.
              </span>
              <b>VIEW PUNISHMENTS →</b>
            </span>
          </a>

          <a
            className={styles.mediaCard}
            href="https://store.mineacle.net/"
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.cardMedia}>
              <img
                src={homeContent.mineaclePlus.media}
                alt=""
                draggable={false}
              />
            </span>
            <span className={styles.mediaShade} />

            <span className={styles.cardContent}>
              <small>MINEACLE+</small>
              <strong>Go further</strong>
              <span>
                Explore Mineacle+ and available upgrades.
              </span>
              <b>OPEN MARKETPLACE ↗</b>
            </span>
          </a>
        </section>
      </main>

      {authMode ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeAuth();
            }
          }}
        >
          <section
            className={`${styles.popup} ${styles.authPopup}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              authMode === "login"
                ? "Log in to Mineacle"
                : "Verify your Mineacle account"
            }
          >
            <button
              className={styles.modalClose}
              type="button"
              onClick={closeAuth}
              aria-label="Close account window"
            >
              ×
            </button>

            {authStage === "edition" ? (
              <>
                <header className={styles.editionHeader}>
                  <small>
                    {authMode === "login"
                      ? "MINEACLE ACCOUNT"
                      : "PLAYER VERIFICATION"}
                  </small>
                  <h2>Choose your edition</h2>
                  <p>
                    Select the Minecraft edition connected
                    to your Mineacle account.
                  </p>
                </header>

                <div className={styles.editionGrid}>
                  <button
                    className={styles.javaEdition}
                    type="button"
                    onClick={() => setAuthStage("form")}
                  >
                    <span className={styles.editionVisual}>
                      <img
                        src={JAVA_EDITION_ICON}
                        alt=""
                        draggable={false}
                      />
                    </span>

                    <span className={styles.editionCopy}>
                      <strong>Java Edition</strong>
                      <small>
                        <i aria-hidden="true" />
                        SUPPORTED
                      </small>
                    </span>

                    <span className={styles.editionArrow}>
                      →
                    </span>
                  </button>

                  <button
                    className={styles.bedrockEdition}
                    type="button"
                    disabled
                    aria-disabled="true"
                  >
                    <span className={styles.editionVisual}>
                      <img
                        src={BEDROCK_EDITION_ICON}
                        alt=""
                        draggable={false}
                      />
                    </span>

                    <span className={styles.editionCopy}>
                      <strong>Bedrock Edition</strong>
                      <small>NOT SUPPORTED YET</small>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  className={styles.authBack}
                  type="button"
                  onClick={() => setAuthStage("edition")}
                >
                  ← Change edition
                </button>

                <AuthClient
                  initialMode={authMode}
                  onAuthenticated={
                    finishPlayerAuthentication
                  }
                />
              </>
            )}
          </section>
        </div>
      ) : null}

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
            className={`${styles.popup} ${styles.joinModal}`}
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
              <h2 id="join-mineacle-title">
                Join Mineacle
              </h2>
              <p>
                Mineacle Open Beta currently supports
                Minecraft: Java Edition.
              </p>
            </header>

            <ol className={styles.joinSteps}>
              <li>
                <span>1</span>
                <div>
                  <strong>
                    Open Minecraft: Java Edition
                  </strong>
                  <p>
                    Launch Minecraft and choose Multiplayer.
                  </p>
                </div>
              </li>

              <li>
                <span>2</span>
                <div>
                  <strong>Add Mineacle</strong>
                  <p>
                    Choose Add Server and enter the address
                    below.
                  </p>
                </div>
              </li>

              <li>
                <span>3</span>
                <div>
                  <strong>Join the world</strong>
                  <p>
                    Select Mineacle from your server list and
                    connect.
                  </p>
                </div>
              </li>
            </ol>

            <div className={styles.serverAddress}>
              <div>
                <small>JAVA SERVER ADDRESS</small>
                <strong>{SERVER_ADDRESS}</strong>
              </div>

              <button
                type="button"
                onClick={copyServerAddress}
              >
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>

            <footer className={styles.modalFooter}>
              <span>Already joined Mineacle?</span>
              <button
                type="button"
                onClick={() => openAuth("create")}
              >
                Verify your player →
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
