"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import type { Viewer } from "@/features/auth/types";
import { homeContent } from "@/features/home/home-content";
import type { SiteNavIcon } from "@/shared/navigation/site-navigation";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";
const NAV_ICON_ROOT = "/shared/images/icons/mineacle-playful";
const CORE_ICON_ROOT = "/shared/images/icons/streamline/core-solid";

const NAV_ICON_PATHS: Record<SiteNavIcon, string> = {
  home: `${NAV_ICON_ROOT}/home.svg`,
  leaderboard: `${NAV_ICON_ROOT}/leaderboards.svg`,
  rewards: `${NAV_ICON_ROOT}/rewards.svg`,
  punishments: `${NAV_ICON_ROOT}/punishments.svg`,
  marketplace: `${NAV_ICON_ROOT}/marketplace.svg`,
};

const HEADER_NAVIGATION = [
  { label: "Home", href: "/", icon: "home" as SiteNavIcon },
  {
    label: "Leaderboard",
    href: "/leaderboards",
    icon: "leaderboard" as SiteNavIcon,
  },
  { label: "Vote", href: "/vote", icon: "rewards" as SiteNavIcon },
  {
    label: "Bans",
    href: "/punishments",
    icon: "punishments" as SiteNavIcon,
  },
  {
    label: "Marketplace",
    href: "https://store.mineacle.net/",
    icon: "marketplace" as SiteNavIcon,
    external: true,
    featured: true,
  },
] as const;

const QUICK_LINKS = [
  {
    title: "Marketplace",
    href: "https://store.mineacle.net/",
    media: homeContent.mineaclePlus.media,
    icon: "marketplace" as SiteNavIcon,
    external: true,
  },
  {
    title: "Vote / Earn a Reward",
    href: "/vote",
    media: "",
    icon: "rewards" as SiteNavIcon,
  },
  {
    title: "Leaderboards",
    href: "/leaderboards",
    media: homeContent.competitive.media,
    icon: "leaderboard" as SiteNavIcon,
  },
] as const;

export type HomeLeaderboardPlayer = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
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
                  src={NAV_ICON_PATHS[item.icon]}
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
                  src={`${CORE_ICON_ROOT}/search.png`}
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
                      placeholder="Search the global player database..."
                    />
                    <button
                      className={styles.closeSearch}
                      type="button"
                      aria-label="Close player search"
                      onClick={() => setSearchOpen(false)}
                    >
                      ×
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
                  src={`${CORE_ICON_ROOT}/user.svg`}
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
            <span className={styles.playButtonText} aria-hidden="true">
              <span>PLAY NOW</span>
              <span>COPIED TO CLIPBOARD</span>
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
            data-card={item.icon}
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
                src={NAV_ICON_PATHS[item.icon]}
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
