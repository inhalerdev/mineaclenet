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
  home: `${ICON_ROOT}/home-hover.gif`,
  leaderboard: `${ICON_ROOT}/leaderboards-hover.gif`,
  rewards: `${ICON_ROOT}/rewards-hover.gif`,
  punishments: `${ICON_ROOT}/punishments-hover.gif`,
  marketplace: `${ICON_ROOT}/marketplace-hover.gif`,
};

const JAVA_EDITION_ICON =
  "/images/home/visitorhome/edition-java.png";
const BEDROCK_EDITION_ICON =
  "/images/home/visitorhome/edition-bedrock.png";
const PLAY_BUTTON_ICON =
  "/images/home/visitorhome/play-button-arrowhead.png";
const PLAY_BUTTON_COPIED_ICON =
  "/images/home/visitorhome/check.png";

const SOCIAL_LINKS = [
  {
    label: "Discord",
    href: "https://discord.gg/4xrYFxdSWg",
    icon: `${SOCIAL_ROOT}/discord-white.gif`,
    animated: true,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@MineacleNetwork",
    icon: `${SOCIAL_ROOT}/youtube-white.svg`,
    animated: false,
  },
  {
    label: "X",
    href: "https://x.com/mineaclenetwork",
    icon: `${SOCIAL_ROOT}/x-white.svg`,
    animated: false,
  },
] as const;

const STATUS_CACHE_KEY =
  "mineacle:home-status:mineacle.net";
const STATUS_CACHE_MAX_AGE = 15_000;

type AuthMode = "login" | "create";
type AuthStage = "edition" | "form";

type VisitorHomeProps = {
  viewer?: Viewer | null;
};

type ServerStatus = {
  online: boolean;
  currentlyPlaying: number;
  checked?: boolean;
  source?: string;
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
  const [navAnimationRun, setNavAnimationRun] =
    useState<Partial<Record<SiteNavIcon, boolean>>>({});
  const [discordAnimationRun, setDiscordAnimationRun] =
    useState(false);

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
    const preloaded = Object.values(NAV_ICON_PATHS).flatMap(
      (src) =>
        ["a", "b"].map((run) => {
          const image = new Image();
          image.src = `${src}?run=${run}`;
          return image;
        }),
    );

    return () => {
      preloaded.forEach((image) => {
        image.src = "";
      });
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
    let requestActive = false;

    function normalizeStatus(
      value: ServerStatus | null,
    ): ServerStatus | null {
      if (!value || typeof value !== "object") {
        return null;
      }

      const count = Number(value.currentlyPlaying || 0);

      return {
        online: value.online === true,
        currentlyPlaying:
          Number.isFinite(count) && count > 0
            ? Math.floor(count)
            : 0,
        checked: value.checked !== false,
        source:
          typeof value.source === "string"
            ? value.source
            : "",
      };
    }

    function readCachedStatus() {
      try {
        const cached = JSON.parse(
          window.localStorage.getItem(
            STATUS_CACHE_KEY,
          ) || "null",
        ) as
          | (ServerStatus & {
              updatedAt?: number;
            })
          | null;

        if (
          !cached ||
          typeof cached.updatedAt !== "number" ||
          Date.now() - cached.updatedAt >
            STATUS_CACHE_MAX_AGE
        ) {
          return null;
        }

        return normalizeStatus(cached);
      } catch {
        return null;
      }
    }

    function writeCachedStatus(status: ServerStatus) {
      try {
        window.localStorage.setItem(
          STATUS_CACHE_KEY,
          JSON.stringify({
            ...status,
            updatedAt: Date.now(),
          }),
        );
      } catch {
        // Storage may be unavailable in private browsing.
      }
    }

    async function loadServerStatus() {
      if (requestActive) {
        return;
      }

      requestActive = true;

      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(
          () => controller.abort(),
          2_400,
        );

        try {
          const response = await fetch(
            `/api/server/status?t=${Date.now()}`,
            {
              cache: "no-store",
              signal: controller.signal,
            },
          );

          if (!response.ok) {
            return;
          }

          const status = normalizeStatus(
            (await response.json()) as ServerStatus,
          );

          if (
            status &&
            status.checked !== false &&
            !cancelled
          ) {
            setServerStatus(status);
            writeCachedStatus(status);
          }
        } finally {
          window.clearTimeout(timeout);
        }
      } catch {
        // Keep the last known state on transient failures.
      } finally {
        requestActive = false;
      }
    }

    const cached = readCachedStatus();

    if (cached) {
      setServerStatus(cached);
    }

    loadServerStatus();

    const timer = window.setInterval(() => {
      if (!document.hidden) {
        loadServerStatus();
      }
    }, 15_000);

    const onFocus = () => loadServerStatus();
    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadServerStatus();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
    };
  }, []);

  function restartNavAnimation(icon: SiteNavIcon) {
    setNavAnimationRun((current) => ({
      ...current,
      [icon]: !current[icon],
    }));
  }

  async function copyServerAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
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

  function finishPlayerAuthentication() {
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
            {siteNavigation.map((item) => {
              const run = navAnimationRun[item.icon] === true;

              return (
                <a
                  className={
                    item.href === "/"
                      ? styles.activeNavItem
                      : undefined
                  }
                  href={item.href}
                  key={item.label}
                  onMouseEnter={() =>
                    restartNavAnimation(item.icon)
                  }
                  aria-label={item.label}
                  {...(item.external
                    ? {
                        target: "_blank",
                        rel: "noreferrer",
                      }
                    : {})}
                >
                  <span className={styles.navIcon}>
                    <img
                      key={`${item.icon}-${run ? "a" : "b"}`}
                      src={`${NAV_ICON_PATHS[item.icon]}?run=${
                        run ? "a" : "b"
                      }`}
                      alt=""
                      draggable={false}
                    />
                  </span>

                  <span className={styles.navLabel}>
                    {item.label}
                  </span>

                  {item.external ? (
                    <small aria-hidden="true">↗</small>
                  ) : null}
                </a>
              );
            })}
          </nav>

          <section
            className={styles.socialSection}
            aria-label="Mineacle social links"
          >
            <div className={styles.socialLinks}>
              {SOCIAL_LINKS.map((social) => (
                <a
                  href={social.href}
                  key={social.label}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                onMouseEnter={
                  social.animated
                    ? () =>
                        setDiscordAnimationRun(
                          (current) => !current,
                        )
                    : undefined
                }
              >
                <img
                  key={
                    social.animated
                      ? `discord-${
                          discordAnimationRun ? "a" : "b"
                        }`
                      : social.icon
                  }
                  src={`${social.icon}${
                    social.animated
                      ? `?run=${
                          discordAnimationRun ? "a" : "b"
                        }`
                      : ""
                  }`}
                  alt=""
                  draggable={false}
                />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>
          </section>
        </aside>

        <PlayerSearch
          className={styles.searchDock}
          placeholder="Search players"
        />

        <div className={styles.accountDock}>
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
                Sign in
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
                <img
                  className={styles.profileChevron}
                  src={`${ICON_ROOT}/profile-dropdown.png`}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
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

          <div className={styles.playGroup}>
            <button
              className={`${styles.playButton} ${
                copied ? styles.playButtonCopied : ""
              }`}
              type="button"
              onClick={copyServerAddress}
              aria-label={
                copied
                  ? "Mineacle server address copied to clipboard"
                  : `Copy Mineacle server address: ${SERVER_ADDRESS}`
              }
            >
              <span
                className={styles.playButtonDefault}
                aria-hidden="true"
              >
                PLAY NOW
              </span>

              <span
                className={styles.playButtonHover}
                aria-hidden="true"
              >
                <img
                  src={PLAY_BUTTON_ICON}
                  alt=""
                  draggable={false}
                />
                <span>
                  {currentlyPlaying} Currently Playing
                </span>
              </span>

              <span
                className={styles.playButtonSuccess}
                aria-hidden={!copied}
                aria-live="polite"
              >
                <img
                  src={PLAY_BUTTON_COPIED_ICON}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
                <span>Copied to Clipboard</span>
              </span>
            </button>
          </div>
        </section>

        <a
          className={`${styles.homePanel} ${styles.rewardsPanel}`}
          href="/vote"
        >
          <div className={styles.panelIconStage}>
            <img
              src={`${ICON_ROOT}/rewards-hover.gif`}
              alt=""
              draggable={false}
            />
          </div>
          <div className={styles.panelShade} aria-hidden="true" />
          <div className={styles.panelContent}>
            <small>VOTE REWARDS</small>
            <strong>Vote & Rewards</strong>
            <span className={styles.panelCta}>VIEW REWARDS</span>
          </div>
        </a>

        <a
          className={`${styles.homePanel} ${styles.marketplacePanel}`}
          href="https://store.mineacle.net/"
          target="_blank"
          rel="noreferrer"
        >
          <div className={styles.panelMedia}>
            <img
              src={homeContent.mineaclePlus.media}
              alt={homeContent.mineaclePlus.mediaLabel}
              draggable={false}
            />
          </div>
          <div className={styles.panelShade} aria-hidden="true" />
          <div className={styles.panelContent}>
            <small>MINEACLE STORE</small>
            <strong>Marketplace</strong>
            <span className={styles.panelCta}>OPEN STORE ↗</span>
          </div>
        </a>

        <a
          className={`${styles.homePanel} ${styles.leaderboardsPanel}`}
          href="/leaderboards"
        >
          <div className={styles.panelMedia}>
            <img
              src={homeContent.competitive.media}
              alt={homeContent.competitive.mediaLabel}
              draggable={false}
            />
          </div>
          <div className={styles.panelShade} aria-hidden="true" />
          <div className={styles.panelContent}>
            <small>LIVE RANKINGS</small>
            <strong>Leaderboards</strong>
            <span className={styles.panelCta}>VIEW RANKINGS</span>
          </div>
        </a>

        <a
          className={`${styles.homePanel} ${styles.punishmentsPanel}`}
          href="/punishments"
        >
          <div className={styles.panelIconStage}>
            <img
              src={`${ICON_ROOT}/punishments-hover.gif`}
              alt=""
              draggable={false}
            />
          </div>
          <div className={styles.panelShade} aria-hidden="true" />
          <div className={styles.panelContent}>
            <small>PUBLIC RECORDS</small>
            <strong>Public bans</strong>
            <span className={styles.panelCta}>SEARCH RECORDS</span>
          </div>
        </a>
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
              className={`${styles.modalClose} ${styles.authClose}`}
              type="button"
              onClick={closeAuth}
              aria-label="Close account window"
            >
              <img
                src={`${ICON_ROOT}/close.svg`}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </button>

            {authStage === "edition" ? (
              <>
                <header className={styles.authIntro}>
                  <span>
                    {authMode === "login"
                      ? "MINEACLE ACCOUNT"
                      : "PLAYER VERIFICATION"}
                  </span>

                  <h2>Choose your edition</h2>

                  <p>
                    Mineacle account access currently supports
                    Java Edition. Choose the platform connected
                    to your player account to continue.
                  </p>
                </header>

                <div className={styles.authEditionGrid}>
                  <button
                    className={styles.authEditionPrimary}
                    type="button"
                    onClick={() => setAuthStage("form")}
                  >
                    <span className={styles.authEditionVisual}>
                      <img
                        src={JAVA_EDITION_ICON}
                        alt=""
                        draggable={false}
                      />
                    </span>

                    <span className={styles.authEditionContent}>
                      <small>AVAILABLE NOW</small>
                      <strong>Continue with Java Edition</strong>
                      <p>
                        Use your Java Minecraft username to
                        log in or connect your Mineacle player
                        account.
                      </p>
                    </span>

                    <span
                      className={styles.authEditionAction}
                      aria-hidden="true"
                    >
                      Continue →
                    </span>
                  </button>

                  <button
                    className={styles.authEditionSecondary}
                    type="button"
                    disabled
                    aria-disabled="true"
                  >
                    <span className={styles.authEditionVisual}>
                      <img
                        src={BEDROCK_EDITION_ICON}
                        alt=""
                        draggable={false}
                      />
                    </span>

                    <span className={styles.authEditionContent}>
                      <small>COMING LATER</small>
                      <strong>Bedrock Edition</strong>
                      <p>
                        Bedrock support is planned, but player
                        verification and account login are not
                        supported yet.
                      </p>
                    </span>

                    <span className={styles.authEditionDisabled}>
                      Unavailable
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.authFlowShell}>
                <div className={styles.authFlowTop}>
                  <button
                    className={styles.authBack}
                    type="button"
                    onClick={() => setAuthStage("edition")}
                  >
                    ← Change edition
                  </button>

                  <div className={styles.authFlowEditionTag}>
                    <img
                      src={JAVA_EDITION_ICON}
                      alt=""
                      draggable={false}
                    />
                    <span>Java Edition</span>
                  </div>
                </div>

                <AuthClient
                  initialMode={authMode}
                  onAuthenticated={finishPlayerAuthentication}
                />
              </div>
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
              className={`${styles.modalClose} ${styles.joinClose}`}
              type="button"
              onClick={() => setJoinOpen(false)}
              aria-label="Close how to join"
            >
              <img
                src={`${ICON_ROOT}/close.svg`}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </button>

            <header className={styles.joinHeader}>
              <span className={styles.joinEyebrow}>
                HOW TO JOIN
              </span>

              <h2 id="join-mineacle-title">
                Play Mineacle
              </h2>

              <p>
                Join the Open Beta in less than a minute.
              </p>
            </header>

            <div
              className={styles.joinEditions}
              aria-label="Supported Minecraft editions"
            >
              <div className={styles.joinEditionActive}>
                <img
                  src={JAVA_EDITION_ICON}
                  alt=""
                  draggable={false}
                />

                <span>
                  <strong>Java Edition</strong>
                  <small>Available now</small>
                </span>

                <b>SUPPORTED</b>
              </div>

              <div
                className={styles.joinEditionUnavailable}
                aria-disabled="true"
              >
                <img
                  src={BEDROCK_EDITION_ICON}
                  alt=""
                  draggable={false}
                />

                <span>
                  <strong>Bedrock Edition</strong>
                  <small>Coming later</small>
                </span>
              </div>
            </div>

            <button
              className={`${styles.joinAddressCard} ${
                copied ? styles.joinAddressCopied : ""
              }`}
              type="button"
              onClick={copyServerAddress}
              aria-label={`Copy Mineacle server address: ${SERVER_ADDRESS}`}
            >
              <span className={styles.joinAddressCopy}>
                <small>JAVA SERVER ADDRESS</small>
                <strong>{SERVER_ADDRESS}</strong>
              </span>

              <span className={styles.joinAddressAction}>
                {copied ? "COPIED" : "COPY"}
              </span>
            </button>

            <div className={styles.joinLiveStatus}>
              <span
                className={`${styles.joinStatusDot} ${
                  serverStatus?.online
                    ? styles.joinStatusDotOnline
                    : ""
                }`}
                aria-hidden="true"
              />

              <strong>{statusLabel}</strong>

              <span>
                <b>{currentlyPlaying}</b>
                Currently Playing
              </span>
            </div>

            <ol className={styles.joinFlow}>
              <li>
                <span className={styles.joinStepNumber}>
                  01
                </span>

                <strong>Open Multiplayer</strong>

                <p>
                  Launch Minecraft: Java Edition and open
                  Multiplayer.
                </p>
              </li>

              <li>
                <span className={styles.joinStepNumber}>
                  02
                </span>

                <strong>Add Mineacle</strong>

                <p>
                  Choose Add Server and paste the server
                  address above.
                </p>
              </li>

              <li>
                <span className={styles.joinStepNumber}>
                  03
                </span>

                <strong>Join the server</strong>

                <p>
                  Save Mineacle, select it from your server
                  list, and connect.
                </p>
              </li>
            </ol>

            <footer className={styles.joinFooter}>
              <div>
                <strong>Already playing Mineacle?</strong>
                <span>
                  Verify your in-game account to connect
                  your website profile.
                </span>
              </div>

              <button
                type="button"
                onClick={() => openAuth("create")}
              >
                Verify account
                <span aria-hidden="true">→</span>
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
