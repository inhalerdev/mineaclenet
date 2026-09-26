"use client";

import { useEffect, useRef, useState } from "react";
import {
  PlayerAvatar,
  playerAvatarUrl,
} from "@/components/players/PlayerAvatar";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import type { Viewer } from "@/features/auth/types";
import {
  mineacleIcons,
  mineacleNavIcons,
} from "@/shared/icons/mineacle-icons";
import block from "@/components/site/BlockButton.module.css";
import styles from "./VisitorHome.module.css";

/*
 * The site header: nav links, logo, Search and My Profile menus, and the
 * hamburger menu on smaller screens. Shared by the homepage and the
 * account pages. Must be rendered inside an element with styles.page
 * (from VisitorHome.module.css), positioned like styles.heroFrame.
 */

const HEADER_NAVIGATION = [
  { label: "Home", href: "/", icon: mineacleNavIcons.home },
  {
    label: "Leaderboard",
    href: "/leaderboards",
    icon: mineacleNavIcons.leaderboards,
  },
  { label: "Vote", href: "/vote", icon: mineacleNavIcons.vote },
  {
    label: "Bans",
    href: "/punishments",
    icon: mineacleNavIcons.bans,
  },
  {
    label: "Marketplace",
    href: "https://store.mineacle.net/",
    icon: mineacleNavIcons.marketplace,
    external: true,
    featured: true,
  },
] as const;

export type HomeLeaderboardPlayer = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
};

type SiteHeaderProps = {
  viewer?: Viewer | null;
  topPlayers?: HomeLeaderboardPlayer[];
  /** Path of the current page, so its nav link is highlighted. */
  currentPath?: string;
};

export function SiteHeader({
  viewer = null,
  topPlayers = [],
  currentPath = "",
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }

      if (mobileNavRef.current && !mobileNavRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenus);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", closeMenus);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1321px)");
    const closeMobileMenu = () => {
      if (desktop.matches) {
        setMobileMenuOpen(false);
      }
    };

    closeMobileMenu();
    desktop.addEventListener("change", closeMobileMenu);

    return () => {
      desktop.removeEventListener("change", closeMobileMenu);
    };
  }, []);

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
    <header className={styles.header}>
      <div className={styles.mobileMenuShell} ref={mobileNavRef}>
        <button
          className={`${styles.mobileMenuButton} ${
            mobileMenuOpen ? styles.mobileMenuButtonOpen : ""
          }`}
          type="button"
          aria-label={
            mobileMenuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
          aria-controls="home-mobile-navigation"
          onClick={() => {
            setMobileMenuOpen((value) => !value);
            setSearchOpen(false);
            setProfileOpen(false);
          }}
        >
          <span />
          <span />
          <span />
        </button>

        {mobileMenuOpen ? (
          <nav
            className={styles.mobileNavigation}
            id="home-mobile-navigation"
            aria-label="Mobile navigation"
          >
            {HEADER_NAVIGATION.map((item) => (
              <a
                className={`${styles.mobileNavigationItem} ${
                  "featured" in item && item.featured
                    ? styles.mobileFeaturedItem
                    : ""
                }`}
                href={item.href}
                key={item.label}
                aria-current={item.href === currentPath ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                {...("external" in item && item.external
                  ? {
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : {})}
              >
                <img src={item.icon} alt="" draggable={false} />
                <span>{item.label}</span>
              </a>
            ))}

            <button
              className={styles.mobileNavigationItem}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
                setProfileOpen(false);
              }}
            >
              <img
                src={mineacleIcons.search}
                alt=""
                draggable={false}
              />
              <span>Search</span>
              <img
                className={styles.mobileMenuArrow}
                src={mineacleIcons.arrowDown}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </button>

            <button
              className={styles.mobileNavigationItem}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setProfileOpen(true);
                setSearchOpen(false);
              }}
            >
              {viewer ? (
                <img
                  className={styles.profileHead}
                  src={playerAvatarUrl(viewer.uuid, 32)}
                  alt=""
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
              ) : (
                <img
                  src={mineacleIcons.profile}
                  alt=""
                  draggable={false}
                />
              )}
              <span>My Profile</span>
              <img
                className={styles.mobileMenuArrow}
                src={mineacleIcons.arrowDown}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </button>
          </nav>
        ) : null}
      </div>

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
            aria-current={item.href === currentPath ? "page" : undefined}
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
              setMobileMenuOpen(false);
            }}
          >
            <img
              src={mineacleIcons.search}
              alt=""
              draggable={false}
            />
            <span>Search</span>
            <img
              className={styles.menuArrow}
              src={
                searchOpen
                  ? mineacleIcons.arrowUp
                  : mineacleIcons.arrowDown
              }
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          </button>

          {searchOpen ? (
            <div
              className={styles.searchPanel}
              id="home-player-search"
            >
              <div className={styles.searchInputRow}>
                <PlayerSearch
                  className={styles.searchField}
                  inline
                  autoFocus
                  iconSrc={mineacleIcons.search}
                  placeholder="Search for a player..."
                />
                <button
                  className={styles.closeSearch}
                  type="button"
                  aria-label="Close player search"
                  onClick={() => setSearchOpen(false)}
                >
                  <img
                    src={mineacleIcons.close}
                    alt=""
                    draggable={false}
                  />
                </button>
              </div>

              <div className={styles.topPlayersHeading}>
                <span>Top 3 players</span>
                <a href="/leaderboards">
                  View leaderboards <b aria-hidden="true">&gt;</b>
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
                      <span
                        className={styles.topPlayerRank}
                        data-rank={index + 1}
                      >
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
                      <small data-online={player.online}>
                        {player.online ? "Online" : "Offline"}
                      </small>
                    </a>
                  ) : (
                    <div
                      className={styles.topPlayerCard}
                      key={`player-${index + 1}`}
                    >
                      <span
                        className={styles.topPlayerRank}
                        data-rank={index + 1}
                      >
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
              setMobileMenuOpen(false);
            }}
          >
            {viewer ? (
              <img
                className={styles.profileHead}
                src={playerAvatarUrl(viewer.uuid, 32)}
                alt=""
                referrerPolicy="no-referrer"
                draggable={false}
              />
            ) : (
              <img
                src={mineacleIcons.profile}
                alt=""
                draggable={false}
              />
            )}
            <span>My Profile</span>
            <img
              className={styles.menuArrow}
              src={
                profileOpen
                  ? mineacleIcons.arrowUp
                  : mineacleIcons.arrowDown
              }
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          </button>

          {profileOpen ? (
            <div
              className={styles.profilePanel}
              id="home-profile-menu"
            >
              {!viewer ? (
                <>
                  <span className={styles.panelKicker}>
                    Player account
                  </span>
                  <a
                    className={`${block.button} ${block.primary}`}
                    href="/login"
                  >
                    Sign in
                  </a>
                  <a
                    className={block.button}
                    href="/register"
                  >
                    Verify account
                  </a>
                  <p className={styles.panelHint}>
                    New here? Link your Minecraft account with a
                    quick in-game code.
                  </p>
                </>
              ) : (
                <>
                  <a className={styles.panelAccount} href="/profile">
                    <img
                      src={playerAvatarUrl(viewer.uuid, 64)}
                      alt=""
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                    <span>
                      <small>Signed in as</small>
                      <strong>{viewer.username}</strong>
                    </span>
                  </a>

                  <span className={styles.menuDivider} aria-hidden="true" />

                  <nav className={styles.menuList} aria-label="Account">
                    <a className={styles.menuRow} href="/profile">
                      <img
                        className={styles.menuIcon}
                        src={mineacleIcons.profile}
                        alt=""
                        draggable={false}
                      />
                      <span>My profile</span>
                    </a>
                    <a className={styles.menuRow} href="/following">
                      <img
                        className={styles.menuIcon}
                        src={mineacleIcons.friends}
                        alt=""
                        draggable={false}
                      />
                      <span>Friends</span>
                    </a>
                    <a
                      className={styles.menuRow}
                      href="/notifications"
                      aria-label={
                        viewer.unreadNotifications > 0
                          ? `Notifications, ${viewer.unreadNotifications} unread`
                          : undefined
                      }
                    >
                      <img
                        className={styles.menuIcon}
                        src={
                          viewer.unreadNotifications > 0
                            ? mineacleIcons.bellUnread
                            : mineacleIcons.bell
                        }
                        alt=""
                        draggable={false}
                      />
                      <span>Notifications</span>
                      {viewer.unreadNotifications > 0 ? (
                        <b className={styles.badge}>
                          {viewer.unreadNotifications > 99
                            ? "99+"
                            : viewer.unreadNotifications}
                        </b>
                      ) : null}
                    </a>
                  </nav>

                  <button
                    className={`${block.button} ${block.danger}`}
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
  );
}
