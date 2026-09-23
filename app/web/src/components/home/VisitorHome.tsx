"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import type { Viewer } from "@/features/auth/types";
import { homeContent } from "@/features/home/home-content";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";
const ICON_ROOT = "/shared/images/icons/mineacle-wireframe";
const PLAY_BUTTON_ICON =
  "/images/home/visitorhome/play-button-arrowhead.png";
const PLAY_BUTTON_COPIED_ICON =
  "/images/home/visitorhome/check.png";
const STATUS_CACHE_KEY = "mineacle:home-status:mineacle.net";
const STATUS_CACHE_MAX_AGE = 15_000;

const ICONS = {
  close: `${ICON_ROOT}/close.png`,
  crate: `${ICON_ROOT}/crate.png`,
  gift: `${ICON_ROOT}/gift.png`,
  gavel: `${ICON_ROOT}/gavel.png`,
  home: `${ICON_ROOT}/home.png`,
  marketplace: `${ICON_ROOT}/marketplace.png`,
  profile: `${ICON_ROOT}/profile.png`,
  search: `${ICON_ROOT}/search.png`,
  trophy: `${ICON_ROOT}/trophy.png`,
};

const HEADER_NAVIGATION = [
  { label: "Home", href: "/", icon: ICONS.home },
  {
    label: "Leaderboard",
    href: "/leaderboards",
    icon: ICONS.trophy,
  },
  { label: "Vote", href: "/vote", icon: ICONS.gift },
  {
    label: "Bans",
    href: "/punishments",
    icon: ICONS.gavel,
  },
  {
    label: "Marketplace",
    href: "https://store.mineacle.net/",
    icon: ICONS.marketplace,
    external: true,
    featured: true,
  },
] as const;

const QUICK_LINKS = [
  {
    title: "Marketplace",
    href: "https://store.mineacle.net/",
    media: homeContent.mineaclePlus.media,
    icon: ICONS.crate,
    card: "marketplace",
    external: true,
  },
  {
    title: "Vote / Earn a Reward",
    href: "/vote",
    media: "",
    icon: ICONS.gift,
    card: "vote",
  },
  {
    title: "Leaderboards",
    href: "/leaderboards",
    media: homeContent.competitive.media,
    icon: ICONS.trophy,
    card: "leaderboards",
  },
] as const;

export type HomeLeaderboardPlayer = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
};

type ServerStatus = {
  online: boolean;
  currentlyPlaying: number;
  checked?: boolean;
  source?: string;
};

type VisitorHomeProps = {
  viewer?: Viewer | null;
  topPlayers?: HomeLeaderboardPlayer[];
};

export function VisitorHome({
  viewer = null,
  topPlayers = [],
}: VisitorHomeProps) {
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [serverStatus, setServerStatus] =
    useState<ServerStatus | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node;

      if (
        searchRef.current &&
        !searchRef.current.contains(target)
      ) {
        setSearchOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenus);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", closeMenus);
      window.removeEventListener("keydown", onKeyDown);

      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

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
          typeof value.source === "string" ? value.source : "",
      };
    }

    function readCachedStatus() {
      try {
        const cached = JSON.parse(
          window.localStorage.getItem(STATUS_CACHE_KEY) || "null",
        ) as
          | (ServerStatus & {
              updatedAt?: number;
            })
          | null;

        if (
          !cached ||
          typeof cached.updatedAt !== "number" ||
          Date.now() - cached.updatedAt > STATUS_CACHE_MAX_AGE
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

          if (status && status.checked !== false && !cancelled) {
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

  const currentlyPlaying = serverStatus
    ? serverStatus.currentlyPlaying.toLocaleString()
    : "—";

  return (
    <div className={styles.page}>
      <section className={styles.heroFrame}>
        <header className={styles.header}>
          <nav
            className={styles.headerNavigation}
            aria-label="Primary navigation"
          >
            {HEADER_NAVIGATION.map((item) => (
              <a
                className={`${styles.headerNavItem} ${
                  "featured" in item && item.featured
                    ? styles.featuredNavItem
                    : ""
                }`}
                href={item.href}
                key={item.label}
                {...("external" in item && item.external
                  ? {
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : {})}
              >
                <img
                  src={item.icon}
                  alt=""
                  draggable={false}
                />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <a
            className={styles.brand}
            href="/"
            aria-label="Mineacle home"
          >
            <img
              src="/shared/images/branding/mineacle-logo.png"
              alt="Mineacle"
              draggable={false}
            />
          </a>

          <div className={styles.headerTools}>
            <div className={styles.searchMenu} ref={searchRef}>
              <button
                className={`${styles.headerToolButton} ${
                  searchOpen ? styles.headerToolButtonOpen : ""
                }`}
                type="button"
                aria-expanded={searchOpen}
                aria-controls="home-player-search"
                onClick={() => {
                  setSearchOpen((value) => !value);
                  setProfileOpen(false);
                }}
              >
                <img
                  src={ICONS.search}
                  alt=""
                  draggable={false}
                />
                <span>Search</span>
                <i aria-hidden="true" />
              </button>

              {searchOpen ? (
                <div
                  className={styles.searchPanel}
                  id="home-player-search"
                >
                  <div className={styles.searchInputRow}>
                    <PlayerSearch
                      className={styles.searchField}
                      iconSrc={ICONS.search}
                      placeholder="Search the global player database..."
                    />
                    <button
                      className={styles.closeSearch}
                      type="button"
                      aria-label="Close player search"
                      onClick={() => setSearchOpen(false)}
                    >
                      <img
                        src={ICONS.close}
                        alt=""
                        draggable={false}
                      />
                    </button>
                  </div>

                  <div className={styles.topPlayersHeading}>
                    <span>Top 3 Players Global</span>
                    <a href="/leaderboards">
                      View More <b aria-hidden="true">›</b>
                    </a>
                  </div>

                  <div className={styles.topPlayersGrid}>
                    {[0, 1, 2].map((index) => {
                      const player = topPlayers[index];

                      return player ? (
                        <a
                          className={styles.topPlayerCard}
                          href={`/player/${encodeURIComponent(
                            player.username,
                          )}`}
                          key={player.uuid}
                        >
                          <span className={styles.topPlayerRank}>
                            #{index + 1}
                          </span>
                          <PlayerAvatar
                            uuid={player.uuid}
                            size={44}
                            className={styles.topPlayerAvatar}
                          />
                          <strong>
                            {player.displayName || player.username}
                          </strong>
                          <small>
                            {player.online ? "Online" : "Player"}
                          </small>
                        </a>
                      ) : (
                        <div
                          className={styles.topPlayerCard}
                          key={`player-${index + 1}`}
                        >
                          <span className={styles.topPlayerRank}>
                            #{index + 1}
                          </span>
                          <span
                            className={styles.topPlayerPlaceholder}
                            aria-hidden="true"
                          />
                          <strong>Player {index + 1}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.profileMenu} ref={profileRef}>
              <button
                className={`${styles.headerToolButton} ${
                  profileOpen ? styles.headerToolButtonOpen : ""
                }`}
                type="button"
                aria-expanded={profileOpen}
                aria-controls="home-profile-menu"
                onClick={() => {
                  setProfileOpen((value) => !value);
                  setSearchOpen(false);
                }}
              >
                <img
                  src={ICONS.profile}
                  alt=""
                  draggable={false}
                />
                <span>My Profile</span>
                <i aria-hidden="true" />
              </button>

              {profileOpen ? (
                <div
                  className={styles.profilePanel}
                  id="home-profile-menu"
                >
                  {!viewer ? (
                    <>
                      <a href="/login?mode=login">Sign in</a>
                      <a href="/login?mode=create">
                        Verify account
                      </a>
                    </>
                  ) : (
                    <>
                      <a href="/profile">Open profile</a>
                      <a href="/following">Friends</a>
                      <a href="/notifications">Notifications</a>
                      <button
                        type="button"
                        onClick={logout}
                        disabled={loggingOut}
                      >
                        {loggingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className={styles.hero}>
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

          <button
            className={`${styles.playButton} ${
              copied ? styles.playButtonCopied : ""
            }`}
            type="button"
            aria-label={
              copied
                ? "Mineacle server address copied"
                : "Copy Mineacle server address"
            }
            onClick={copyServerAddress}
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
              <span>{currentlyPlaying} Currently Playing</span>
            </span>
            <span
              className={styles.playButtonSuccess}
              aria-hidden={!copied}
            >
              <img
                src={PLAY_BUTTON_COPIED_ICON}
                alt=""
                draggable={false}
              />
              <span>IP Copied</span>
            </span>
          </button>
        </div>
      </section>

      <section
        className={styles.quickGrid}
        aria-label="Mineacle quick links"
      >
        {QUICK_LINKS.map((item) => (
          <a
            className={styles.quickCard}
            data-card={item.card}
            href={item.href}
            key={item.title}
            {...("external" in item && item.external
              ? {
                  target: "_blank",
                  rel: "noreferrer",
                }
              : {})}
          >
            {item.media ? (
              <img
                className={styles.quickCardMedia}
                src={item.media}
                alt=""
                draggable={false}
              />
            ) : null}
            <span className={styles.quickCardShade} aria-hidden="true" />
            <span className={styles.quickCardIcon} aria-hidden="true">
              <img
                src={item.icon}
                alt=""
                draggable={false}
              />
            </span>
            <strong>{item.title}</strong>
          </a>
        ))}
      </section>

      <span className={styles.copyStatus} role="status" aria-live="polite">
        {copied ? `${SERVER_ADDRESS} copied to clipboard` : ""}
      </span>
    </div>
  );
}
