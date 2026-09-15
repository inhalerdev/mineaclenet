"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import type { Viewer } from "@/features/auth/types";
import { useOneShotGif } from "@/shared/media/use-one-shot-gif";
import {
  siteNavigation,
  type SiteNavIcon,
  type SiteNavItem,
} from "@/shared/navigation/site-navigation";
import { useNavigationDrawer } from "@/shared/navigation/use-navigation-drawer";

const ICON_ROOT =
  "/shared/images/icons/streamline/core-solid";
const SOCIAL_ROOT =
  "/shared/images/icons/streamline/logos";

const NAV_ICON_PATHS: Record<SiteNavIcon, string> = {
  home: `${ICON_ROOT}/home-hover.gif`,
  leaderboard: `${ICON_ROOT}/leaderboards-hover.gif`,
  rewards: `${ICON_ROOT}/rewards-hover.gif`,
  punishments: `${ICON_ROOT}/punishments-hover.gif`,
  marketplace: `${ICON_ROOT}/marketplace-hover.gif`,
};

const SOCIAL_LINKS = [
  {
    label: "Discord",
    href: "https://discord.gg/4xrYFxdSWg",
    icon: `${SOCIAL_ROOT}/discord-white.gif`,
  },
  {
    label: "X",
    href: "https://x.com/mineaclenetwork",
    icon: `${SOCIAL_ROOT}/x.gif`,
  },
] as const;

function AssetIcon({
  src,
  className = "asset-icon",
}: {
  src: string;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={src}
      alt=""
      draggable={false}
    />
  );
}

function SidebarSocialLink({
  social,
  mobile = false,
  onClick,
}: {
  social: (typeof SOCIAL_LINKS)[number];
  mobile?: boolean;
  onClick?: () => void;
}) {
  const animation = useOneShotGif(social.icon);

  return (
    <a
      className={mobile ? undefined : "sidebar-social-link"}
      href={social.href}
      aria-label={social.label}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      onMouseEnter={animation.start}
      onMouseLeave={animation.stop}
    >
      {mobile ? (
        <>
          <AssetIcon
            key={animation.src}
            src={animation.src}
          />
          <span>{social.label}</span>
        </>
      ) : (
        <>
          <span className="sidebar-social-link__icon">
            <AssetIcon
              key={animation.src}
              src={animation.src}
            />
          </span>

          <span className="sidebar-social-link__label">
            {social.label}
          </span>
        </>
      )}
    </a>
  );
}

function navItemIsActive(
  pathname: string,
  item: SiteNavItem,
) {
  if (item.external || !item.href.startsWith("/")) {
    return false;
  }

  if (item.href === "/") {
    return pathname === "/";
  }

  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`)
  );
}

export function AppSidebar({
  viewer = null,
}: {
  viewer?: Viewer | null;
}) {
  const pathname = usePathname();
  const {
    collapsed: navigationCollapsed,
    toggle: toggleNavigation,
  } = useNavigationDrawer();
  const [mobileOpen, setMobileOpen] =
    useState(false);
  const [navAnimationRun, setNavAnimationRun] =
    useState<Partial<Record<SiteNavIcon, boolean>>>({});

  const closeMobile = () =>
    setMobileOpen(false);

  function restartNavAnimation(icon: SiteNavIcon) {
    setNavAnimationRun((current) => ({
      ...current,
      [icon]: !current[icon],
    }));
  }

  return (
    <>
      <aside
        className={`site-sidebar ${
          navigationCollapsed ? "is-collapsed" : ""
        }`}
      >
        <div className="sidebar-head">
          <a
            className="sidebar-brand"
            href="/"
            aria-label="Mineacle home"
          >
            <span className="sidebar-brand__mark">
              <img
                src="/shared/images/branding/mineacle-mark.png"
                alt=""
              />
            </span>

            <img
              className="sidebar-brand__wordmark"
              src="/shared/images/branding/mineacle-logo.png"
              alt="Mineacle"
            />
          </a>

          <button
            className="sidebar-drawer-toggle"
            type="button"
            aria-expanded={!navigationCollapsed}
            aria-label={
              navigationCollapsed
                ? "Expand navigation"
                : "Collapse navigation"
            }
            title={
              navigationCollapsed
                ? "Expand navigation"
                : "Collapse navigation"
            }
            onClick={toggleNavigation}
          >
            <span aria-hidden="true">
              {navigationCollapsed ? "›" : "‹"}
            </span>
          </button>
        </div>

        <PlayerSearch
          className="sidebar-player-search"
          placeholder="Search player"
          variant="rail"
        />

        <nav
          className="sidebar-nav"
          aria-label="Primary navigation"
        >
          {siteNavigation.map((item) => {
            const active = navItemIsActive(
              pathname,
              item,
            );
            const icon =
              NAV_ICON_PATHS[item.icon];
            const run =
              navAnimationRun[item.icon] === true;

            return (
              <a
                aria-current={
                  active ? "page" : undefined
                }
                className={`sidebar-nav__item ${
                  active ? "is-active" : ""
                }`}
                href={item.href}
                key={item.label}
                onMouseEnter={() =>
                  restartNavAnimation(item.icon)
                }
                {...(item.external
                  ? {
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : {})}
              >
                <span className="sidebar-nav__icon">
                  <AssetIcon
                    className="asset-icon nav-gif-icon"
                    key={`${item.icon}-${run ? "a" : "b"}`}
                    src={`${icon}?run=${run ? "a" : "b"}`}
                  />
                </span>

                <span className="sidebar-nav__label">
                  {item.label}
                </span>

                {item.external ? (
                  <span className="sidebar-nav__external">
                    ↗
                  </span>
                ) : null}
              </a>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-actions">
          <div className="sidebar-socials">
            {SOCIAL_LINKS.map((social) => (
              <SidebarSocialLink
                key={social.label}
                social={social}
              />
            ))}
          </div>

          <a
            className="sidebar-account-action"
            href={viewer ? "/profile" : "/login"}
          >
            <span className="sidebar-account-action__icon">
              {viewer ? (
                <span className="rail-user">
                  {viewer.username
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              ) : (
                <AssetIcon
                  src={`${ICON_ROOT}/user.svg`}
                />
              )}
            </span>

            <span className="sidebar-account-action__copy">
              <small>
                {viewer
                  ? "Verified player"
                  : "Player account"}
              </small>

              <strong>
                {viewer
                  ? viewer.username
                  : "Log in / Sign up"}
              </strong>
            </span>

            <span className="sidebar-account-action__arrow">
              →
            </span>
          </a>
        </div>
      </aside>

      <header className="mobile-header">
        <button
          className="mobile-menu-button"
          onClick={() =>
            setMobileOpen(
              (value) => !value,
            )
          }
          type="button"
          aria-expanded={mobileOpen}
          aria-label={
            mobileOpen
              ? "Close navigation"
              : "Open navigation"
          }
        >
          <span
            className="menu-icon"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </span>
        </button>

        <a
          className="mobile-brand"
          href="/"
          aria-label="Mineacle home"
        >
          <img
            src="/shared/images/branding/mineacle-mark.png"
            alt="Mineacle"
          />
        </a>

        <a
          className="mobile-account-button"
          href={viewer ? "/profile" : "/login"}
        >
          {viewer
            ? viewer.username
            : "Log in"}
        </a>
      </header>

      <div
        className={`mobile-drawer ${
          mobileOpen ? "is-open" : ""
        }`}
      >
        <button
          className="mobile-drawer__scrim"
          onClick={closeMobile}
          type="button"
          aria-label="Close navigation"
        />

        <aside
          className="mobile-drawer__panel"
          aria-label="Mobile navigation"
        >
          <PlayerSearch
            className="mobile-player-search"
            placeholder="Search player"
            variant="rail"
          />

          <nav>
            {siteNavigation.map((item) => {
              const active =
                navItemIsActive(
                  pathname,
                  item,
                );

              return (
                <a
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  className={
                    active ? "is-active" : ""
                  }
                  href={item.href}
                  key={item.label}
                  onClick={closeMobile}
                  {...(item.external
                    ? {
                        target: "_blank",
                        rel: "noreferrer",
                      }
                    : {})}
                >
                  <AssetIcon
                    src={
                      NAV_ICON_PATHS[
                        item.icon
                      ]
                    }
                  />

                  <span>{item.label}</span>

                  {item.external ? (
                    <small>↗</small>
                  ) : null}
                </a>
              );
            })}
          </nav>

          <div className="mobile-drawer__bottom">
            <div className="mobile-drawer__socials">
              {SOCIAL_LINKS.map(
                (social) => (
                  <SidebarSocialLink
                    key={social.label}
                    mobile
                    onClick={closeMobile}
                    social={social}
                  />
                ),
              )}
            </div>

            <a
              className="mobile-drawer__account"
              href={
                viewer
                  ? "/profile"
                  : "/login"
              }
              onClick={closeMobile}
            >
              {viewer ? (
                <span className="rail-user">
                  {viewer.username
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              ) : (
                <AssetIcon
                  src={`${ICON_ROOT}/user.svg`}
                />
              )}

              <span>
                {viewer
                  ? viewer.username
                  : "Log in / Sign up"}
              </span>

              <small>→</small>
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
