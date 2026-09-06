"use client";

import { useEffect, useRef, useState } from "react";
import { AuthClient } from "@/components/auth/AuthClient";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import type { Viewer } from "@/features/auth/types";
import { homeContent } from "@/features/home/home-content";
import {
  siteNavigation,
  type SiteNavIcon,
} from "@/shared/navigation/site-navigation";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";
const ICON_ROOT = "/shared/images/icons/streamline/core-solid";
const SOCIAL_ROOT = "/shared/images/icons/streamline/logos";

const NAV_ICON_PATHS: Record<SiteNavIcon, string> = {
  home: `${ICON_ROOT}/home.svg`,
  leaderboard: `${ICON_ROOT}/leaderboards.svg`,
  rewards: `${ICON_ROOT}/rewards.svg`,
  punishments: `${ICON_ROOT}/punishments.svg`,
  marketplace: `${ICON_ROOT}/marketplace.svg`,
};

const JAVA_EDITION_ICON =
  "/images/home/visitorhome/edition-java.png";
const BEDROCK_EDITION_ICON =
  "/images/home/visitorhome/edition-bedrock.png";

const SOCIAL_LINKS = [
  {
    label: "Discord",
    href: "https://discord.gg/4xrYFxdSWg",
    icon: `${SOCIAL_ROOT}/discord-white.svg`,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@MineacleNetwork",
    icon: `${SOCIAL_ROOT}/youtube-white.svg`,
  },
  {
    label: "X",
    href: "https://x.com/mineaclenetwork",
    icon: `${SOCIAL_ROOT}/x-white.svg`,
  },
] as const;

const RELEASE_FEATURES = [
  "Player Economy",
  "Teams",
  "Auction House",
  "Live Rankings",
] as const;

type AuthMode = "login" | "create";
type AuthStage = "edition" | "form";

type VisitorHomeProps = {
  viewer?: Viewer | null;
};

type ServerStatus = {
  online: boolean;
  currentlyPlaying: number;
};

function playerBodyUrl(uuid: string) {
  return `https://mc-heads.net/body/${encodeURIComponent(uuid)}/110.png`;
}

export function VisitorHome({
  viewer = null,
}: VisitorHomeProps) {
  const [copied, setCopied] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [authMode, setAuthMode] =
    useState<AuthMode | null>(null);
  const [authStage, setAuthStage] =
    useState<AuthStage>("edition");
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [serverStatus, setServerStatus] =
    useState<ServerStatus | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  const modalOpen = joinOpen || authMode !== null;

  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setProfileOpen(false);
      setJoinOpen(false);
      setAuthMode(null);
      setAuthStage("edition");
    }

    document.addEventListener("mousedown", closeProfile);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", closeProfile);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadServerStatus() {
      try {
        const response = await fetch("/api/server/status", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as ServerStatus;

        if (!cancelled) {
          setServerStatus({
            online: data.online === true,
            currentlyPlaying: Math.max(
              0,
              Number(data.currentlyPlaying || 0),
            ),
          });
        }
      } catch {
        if (!cancelled) {
          setServerStatus({
            online: false,
            currentlyPlaying: 0,
          });
        }
      }
    }

    loadServerStatus();
    const timer = window.setInterval(loadServerStatus, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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

  function openAuth(mode: AuthMode) {
    setProfileOpen(false);
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
      // Public visitors may not have a preview cookie.
    }

    window.location.replace("/");
  }

  async function logout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });
    } finally {
      window.location.replace("/");
    }
  }

  const statusLabel = !serverStatus
    ? "Checking server"
    : serverStatus.online
      ? "Server Online"
      : "Server Offline";

  const currentlyPlaying = serverStatus
    ? serverStatus.currentlyPlaying.toLocaleString()
    : "—";

  return (
    <>
      <main className={styles.page}>
        <aside
          className={styles.sideNav}
          aria-label="Mineacle navigation"
        >
          <nav
            className={styles.primaryNav}
            aria-label="Primary navigation"
          >
            {siteNavigation.map((item) => (
              <a
                className={
                  item.href === "/"
                    ? styles.activeNavItem
                    : undefined
                }
                href={item.href}
                key={item.label}
                {...(item.external
                  ? {
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : {})}
              >
                <span className={styles.navIcon}>
                  <img
                    src={NAV_ICON_PATHS[item.icon]}
                    alt=""
                    draggable={false}
                  />
                </span>

                <span>{item.label}</span>

                {item.external ? (
                  <small aria-hidden="true">↗</small>
                ) : null}
              </a>
            ))}
          </nav>

          {viewer ? (
            <section className={styles.memberModule}>
              <small>MY MINEACLE</small>

              <div className={styles.memberIdentity}>
                <PlayerAvatar
                  uuid={viewer.uuid}
                  size={32}
                  className={styles.memberHead}
                  eager
                />

                <span>
                  <strong>{viewer.username}</strong>
                  <small>VERIFIED PLAYER</small>
                </span>
              </div>

              <nav
                className={styles.memberLinks}
                aria-label="My Mineacle"
              >
                <a href="/profile">
                  Profile
                  <span>→</span>
                </a>

                <a href="/following">
                  Following
                  <b>{viewer.followingCount}</b>
                </a>

                <a href="/notifications">
                  Notifications
                  <b>{viewer.unreadNotifications}</b>
                </a>

                <a href="/team">
                  My team
                  <span>→</span>
                </a>
              </nav>
            </section>
          ) : null}

          <div className={styles.sideNavSpacer} />

          <section className={styles.socialSection}>
            <small>COMMUNITY</small>

            <div className={styles.socialLinks}>
              {SOCIAL_LINKS.map((social) => (
                <a
                  href={social.href}
                  key={social.label}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                >
                  <img
                    src={social.icon}
                    alt=""
                    draggable={false}
                  />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>
          </section>

          <div className={styles.railLegal}>
            <strong>© 2026 Mineacle Studios</strong>
            <span>All Rights Reserved.</span>
            <p>
              Not affiliated with or endorsed by Mojang
              Studios or Microsoft.
            </p>
          </div>
        </aside>

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

          <div className={styles.heroTop}>
            <PlayerSearch
              className={styles.heroSearch}
              placeholder="Search for a player"
            />

            <a
              className={styles.heroTopLogo}
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

            {!viewer ? (
              <div className={styles.accountActions}>
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
              </div>
            ) : (
              <div
                className={styles.profileMenu}
                ref={profileRef}
              >
                <button
                  className={styles.profileTrigger}
                  type="button"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() =>
                    setProfileOpen((value) => !value)
                  }
                >
                  <PlayerAvatar
                    uuid={viewer.uuid}
                    size={32}
                    className={styles.profileHead}
                    eager
                  />

                  <span>{viewer.username}</span>
                  <small aria-hidden="true">⌄</small>
                </button>

                {profileOpen ? (
                  <div
                    className={styles.profileDropdown}
                    role="menu"
                  >
                    <div className={styles.profileSkin}>
                      <img
                        src={playerBodyUrl(viewer.uuid)}
                        alt={`${viewer.username} skin`}
                        draggable={false}
                      />
                    </div>

                    <div className={styles.profileDetails}>
                      <div className={styles.profileIdentity}>
                        <PlayerAvatar
                          uuid={viewer.uuid}
                          size={38}
                          className={styles.dropdownHead}
                          eager
                        />

                        <span>
                          <small>VERIFIED PLAYER</small>
                          <strong>{viewer.username}</strong>
                        </span>
                      </div>

                      <nav>
                        <a href="/profile">
                          Manage profile
                          <span>→</span>
                        </a>

                        <a href="/following">
                          Following
                          <b>{viewer.followingCount}</b>
                        </a>

                        <a href="/notifications">
                          Notifications
                          {viewer.unreadNotifications > 0 ? (
                            <b>
                              {viewer.unreadNotifications}
                            </b>
                          ) : (
                            <span>→</span>
                          )}
                        </a>
                      </nav>

                      <button
                        className={styles.logoutButton}
                        type="button"
                        onClick={logout}
                        disabled={loggingOut}
                      >
                        {loggingOut
                          ? "Logging out..."
                          : "Log out"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className={styles.heroFooter}>
            <div className={styles.heroCopy}>
              <div className={styles.serverSummary}>
                <span
                  className={`${styles.serverDot} ${
                    serverStatus?.online
                      ? styles.serverDotOnline
                      : ""
                  }`}
                  aria-hidden="true"
                />

                <strong>{statusLabel}</strong>

                <span className={styles.currentlyPlaying}>
                  <b>{currentlyPlaying}</b>
                  Currently Playing
                </span>
              </div>

              <small className={styles.heroEyebrow}>
                MINEACLE OPEN BETA
              </small>

              <h1>Build. Trade. Compete.</h1>

              <p>
                A competitive survival economy built around
                player progression, teams, trading, and
                reputation.
              </p>

              <div
                className={styles.featurePills}
                aria-label="Open beta features"
              >
                {RELEASE_FEATURES.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
            </div>

            <div className={styles.playGroup}>
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

              <button
                className={styles.joinGuide}
                type="button"
                onClick={() => setJoinOpen(true)}
              >
                How to join mineacle.net
              </button>
            </div>

            <div aria-hidden="true" />
          </div>
        </section>

        <section
          className={styles.quickModules}
          aria-label="Quick access"
        >
          <a
            className={styles.quickCard}
            href="/leaderboards"
          >
            <div className={styles.quickMedia}>
              <img
                src={homeContent.competitive.media}
                alt=""
                draggable={false}
              />
            </div>

            <div
              className={styles.quickShade}
              aria-hidden="true"
            />

            <div className={styles.quickContent}>
              <small>COMPETE</small>
              <strong>Leaderboards</strong>
              <p>See who is leading Mineacle.</p>
              <span>VIEW RANKINGS →</span>
            </div>
          </a>

          <a className={styles.quickCard} href="/vote">
            <div
              className={`${styles.quickMedia} ${styles.quickFallback}`}
            >
              <img
                className={styles.quickIcon}
                src={`${ICON_ROOT}/rewards.svg`}
                alt=""
                draggable={false}
              />
            </div>

            <div
              className={styles.quickShade}
              aria-hidden="true"
            />

            <div className={styles.quickContent}>
              <small>REWARDS</small>
              <strong>Vote & earn</strong>
              <p>Support Mineacle and collect rewards.</p>
              <span>VIEW REWARDS →</span>
            </div>
          </a>

          <a
            className={styles.quickCard}
            href="/punishments"
          >
            <div
              className={`${styles.quickMedia} ${styles.quickFallback}`}
            >
              <img
                className={styles.quickIcon}
                src={`${ICON_ROOT}/punishments.svg`}
                alt=""
                draggable={false}
              />
            </div>

            <div
              className={styles.quickShade}
              aria-hidden="true"
            />

            <div className={styles.quickContent}>
              <small>PUBLIC RECORDS</small>
              <strong>Punishments</strong>
              <p>Search public player actions.</p>
              <span>VIEW RECORDS →</span>
            </div>
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
                    onClick={() =>
                      setAuthStage("form")
                    }
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
                      <small>SUPPORTED</small>
                    </span>

                    <span
                      className={styles.editionArrow}
                      aria-hidden="true"
                    >
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
                  onClick={() =>
                    setAuthStage("edition")
                  }
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
                    Select Mineacle from your server list
                    and connect.
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
