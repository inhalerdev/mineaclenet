"use client";

import { useEffect, useRef, useState } from "react";
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
const NAV_ICON_ROOT =
  "/shared/images/icons/mineacle-playful";
const SOCIAL_ICON_ROOT =
  "/shared/images/icons/streamline/logos";

const NAV_ICON_PATHS: Record<SiteNavIcon, string> = {
  home: `${NAV_ICON_ROOT}/home.svg`,
  leaderboard: `${NAV_ICON_ROOT}/leaderboards.svg`,
  rewards: `${NAV_ICON_ROOT}/rewards.svg`,
  punishments: `${NAV_ICON_ROOT}/punishments.svg`,
  marketplace: `${NAV_ICON_ROOT}/marketplace.svg`,
};

const SOCIAL_LINKS = [
  {
    label: "Discord",
    href: "https://discord.gg/4xrYFxdSWg",
    icon: `${SOCIAL_ICON_ROOT}/discord-white.gif`,
  },
  {
    label: "X",
    href: "https://x.com/mineaclenetwork",
    icon: `${SOCIAL_ICON_ROOT}/x-white.svg`,
  },
] as const;

const QUICK_LINKS = [
  {
    accent: "marketplace",
    eyebrow: "STORE",
    title: "Marketplace",
    description: "Ranks & extras",
    href: "https://store.mineacle.net/",
    icon: "marketplace" as SiteNavIcon,
    external: true,
  },
  {
    accent: "rewards",
    eyebrow: "FREE PERKS",
    title: "Vote & earn",
    description: "Claim rewards",
    href: "/vote",
    icon: "rewards" as SiteNavIcon,
  },
  {
    accent: "leaderboards",
    eyebrow: "RANKINGS",
    title: "Leaderboards",
    description: "See who's on top",
    href: "/leaderboards",
    icon: "leaderboard" as SiteNavIcon,
  },
  {
    accent: "records",
    eyebrow: "LOOKUP",
    title: "Player records",
    description: "Search a player",
    href: "/punishments",
    icon: "punishments" as SiteNavIcon,
  },
] as const;

const STATUS_CACHE_KEY =
  "mineacle:home-status:mineacle.net";
const STATUS_CACHE_MAX_AGE = 15_000;

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
      typeof value.source === "string" ? value.source : "",
  };
}

export function VisitorHome({
  viewer = null,
}: VisitorHomeProps) {
  const [copied, setCopied] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [serverStatus, setServerStatus] =
    useState<ServerStatus | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);

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
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", closeProfile);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", closeProfile);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let requestActive = false;

    function readCachedStatus() {
      try {
        const cached = JSON.parse(
          window.localStorage.getItem(STATUS_CACHE_KEY) ||
            "null",
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
        // Storage can be unavailable in private browsing.
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
        // Keep the last known server state on a transient failure.
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

  async function copyServerAddress() {
    let copiedSuccessfully = false;

    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      copiedSuccessfully = true;
    } catch {
      const input = document.createElement("textarea");
      input.value = SERVER_ADDRESS;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      copiedSuccessfully = document.execCommand("copy");
      input.remove();
    }

    setCopied(copiedSuccessfully);

    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }

    copyTimerRef.current = window.setTimeout(
      () => setCopied(false),
      1_800,
    );
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

  const isOnline = serverStatus?.online === true;
  const currentlyPlaying = serverStatus
    ? serverStatus.currentlyPlaying.toLocaleString()
    : "—";

  return (
    <div className={styles.page}>
      <aside
        className={styles.sidebar}
        aria-label="Mineacle navigation"
      >
        <a
          className={styles.brand}
          href="/"
          aria-label="Mineacle home"
        >
          <img
            className={styles.brandWordmark}
            src="/shared/images/branding/mineacle-logo.png"
            alt="Mineacle"
            draggable={false}
          />
          <img
            className={styles.brandMark}
            src="/shared/images/branding/mineacle-mark.png"
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <span>PLAY · CREATE · COMPETE</span>
        </a>

        <div className={styles.betaBadge}>
          <i aria-hidden="true" />
          Open Beta is live
        </div>

        <nav
          className={styles.primaryNav}
          aria-label="Primary navigation"
        >
          {siteNavigation.map((item) => (
            <a
              className={
                item.href === "/" ? styles.activeNavItem : ""
              }
              data-icon={item.icon}
              href={item.href}
              key={item.label}
              aria-current={
                item.href === "/" ? "page" : undefined
              }
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
              <small aria-hidden="true">
                {item.external ? "↗" : "›"}
              </small>
            </a>
          ))}
        </nav>

        <div className={styles.sidebarSpacer} />

        <div className={styles.sidebarNote}>
          <span aria-hidden="true">✦</span>
          <div>
            <small>MINEACLE NETWORK</small>
            <strong>Play your way.</strong>
          </div>
        </div>

        <div className={styles.socialRow}>
          {SOCIAL_LINKS.map((social) => (
            <a
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              key={social.label}
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
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topBar}>
          <a className={styles.announcement} href="/vote">
            <span className={styles.announcementIcon} aria-hidden="true">
              ✦
            </span>
            <span>
              <small>THIS WEEK ON MINEACLE</small>
              <strong>Vote, play, and collect fresh rewards</strong>
            </span>
            <b aria-hidden="true">→</b>
          </a>

          <PlayerSearch
            className={styles.playerSearch}
            placeholder="Find a player..."
          />

          <div className={styles.accountDock}>
            {!viewer ? (
              <>
                <a
                  className={styles.verifyButton}
                  href="/login?mode=create"
                >
                  Verify player
                </a>
                <a
                  className={styles.signInButton}
                  href="/login?mode=login"
                >
                  Sign in
                </a>
              </>
            ) : (
              <>
                <a
                  className={styles.accountShortcut}
                  href="/following"
                >
                  Friends
                </a>
                <a
                  className={styles.accountShortcut}
                  href="/profile"
                >
                  Settings
                </a>

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
                    <b aria-hidden="true">⌄</b>
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
                        <small>VERIFIED PLAYER</small>
                        <strong>{viewer.username}</strong>
                        <a href="/profile">Open profile</a>
                        <a href="/following">
                          Friends <b>{viewer.followingCount}</b>
                        </a>
                        <a href="/notifications">
                          Notifications
                          {viewer.unreadNotifications > 0 ? (
                            <b>{viewer.unreadNotifications}</b>
                          ) : null}
                        </a>
                        <button
                          type="button"
                          onClick={logout}
                          disabled={loggingOut}
                        >
                          {loggingOut ? "Signing out..." : "Sign out"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </header>

        <main className={styles.dashboard}>
          <section
            className={styles.hero}
            aria-label="Play Mineacle"
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
            <div className={styles.heroShade} aria-hidden="true" />
            <span className={styles.heroSticker} aria-hidden="true">
              <small>JAVA</small>
              LET&apos;S GO!
              <b>★</b>
            </span>

            <div className={styles.heroContent}>
              <span className={styles.heroEyebrow}>
                <i aria-hidden="true" />
                MINEACLE OPEN BETA
              </span>
              <h1>Come play your way.</h1>
              <p>
                Build a base, chase the top spot, or just hang out.
                Mineacle is your place to jump in and have fun.
              </p>

              <div className={styles.heroActions}>
                <button type="button" onClick={copyServerAddress}>
                  <span aria-hidden="true">▶</span>
                  {copied ? "Copied to clipboard" : "Play Mineacle"}
                </button>
                <a href="/vote">
                  Grab free rewards
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </section>

          <section className={styles.liveBand}>
            <div className={styles.liveCounter}>
              <span
                className={`${styles.liveRing} ${
                  isOnline ? styles.liveRingOnline : ""
                }`}
              >
                <b>{currentlyPlaying}</b>
                <small>ONLINE</small>
              </span>
              <span>
                <small>LIVE SERVER</small>
                <strong>
                  {isOnline ? "The world is live" : "Checking the world"}
                </strong>
                <p>Java Edition · mineacle.net</p>
              </span>
            </div>

            <div className={styles.joinGuide}>
              <header>
                <small>QUICK START</small>
                <strong>Three tiny steps. Zero fuss.</strong>
              </header>
              <ol className={styles.joinTrack}>
                <li>
                  <b>1</b>
                  <span>
                    <small>FIRST</small>
                    <strong>Copy the IP</strong>
                  </span>
                </li>
                <li>
                  <b>2</b>
                  <span>
                    <small>THEN</small>
                    <strong>Open Multiplayer</strong>
                  </span>
                </li>
                <li>
                  <b>3</b>
                  <span>
                    <small>GO!</small>
                    <strong>Join the fun</strong>
                  </span>
                </li>
              </ol>
            </div>
          </section>

          <section className={styles.actionShelf}>
            <header className={styles.actionHeading}>
              <small>ONE TAP AWAY</small>
              <strong>Where to?</strong>
            </header>

            <div className={styles.actionGrid}>
              {QUICK_LINKS.map((item) => (
                <a
                  className={styles.actionCard}
                  data-accent={item.accent}
                  href={item.href}
                  key={item.title}
                  {...("external" in item && item.external
                    ? {
                        target: "_blank",
                        rel: "noreferrer",
                      }
                    : {})}
                >
                  <span className={styles.actionCardIcon}>
                    <img
                      src={NAV_ICON_PATHS[item.icon]}
                      alt=""
                      draggable={false}
                    />
                  </span>
                  <span className={styles.actionCardCopy}>
                    <small>{item.eyebrow}</small>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </span>
                  <b className={styles.actionCardArrow} aria-hidden="true">
                    {"external" in item && item.external ? "↗" : "→"}
                  </b>
                </a>
              ))}
            </div>
          </section>

          <section className={styles.playfulRow}>
            <div className={styles.worldCard}>
              <span className={styles.worldDecor} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className={styles.worldCopy}>
                <small>YOUR WORLD, YOUR RULES</small>
                <strong>What sounds fun today?</strong>
                <p>Build it. Trade it. Win it. Or invent something new.</p>
              </span>
              <div className={styles.worldChoices} aria-label="Ways to play">
                <span data-tone="purple"><b>✦</b> Build</span>
                <span data-tone="green"><b>◇</b> Explore</span>
                <span data-tone="blue"><b>★</b> Compete</span>
              </div>
            </div>

            <a
              className={styles.discordCard}
              href="https://discord.gg/4xrYFxdSWg"
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.discordIcon}>
                <img
                  src={`${SOCIAL_ICON_ROOT}/discord-white.gif`}
                  alt=""
                  draggable={false}
                />
              </span>
              <span>
                <small>COMMUNITY</small>
                <strong>Find your crew</strong>
                <span>Chat, team up, and share builds.</span>
              </span>
              <b aria-hidden="true">↗</b>
            </a>

            <a
              className={styles.playerPassCard}
              href={viewer ? "/profile" : "/login?mode=create"}
            >
              <span className={styles.playerPassMark} aria-hidden="true">
                M
              </span>
              <span>
                <small>MINEACLE PLAYER PASS</small>
                <strong>
                  {viewer
                    ? `Welcome back, ${viewer.username}`
                    : "Make it yours"}
                </strong>
                <span>
                  {viewer
                    ? "Your profile is ready."
                    : "Connect your in-game player."}
                </span>
              </span>
              <b aria-hidden="true">→</b>
            </a>
          </section>
        </main>
      </section>

      <div
        className={`${styles.copyToast} ${
          copied ? styles.copyToastVisible : ""
        }`}
        role="status"
        aria-live="polite"
      >
        <span aria-hidden="true">✓</span>
        <strong>Server IP copied</strong>
        <small>{SERVER_ADDRESS}</small>
      </div>
    </div>
  );
}
