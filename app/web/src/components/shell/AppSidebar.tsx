"use client";

import { useState } from "react";
import type { Viewer } from "@/features/auth/types";
import {
  siteNavigation,
  type SiteNavIcon,
} from "@/shared/navigation/site-navigation";

const ICON_ROOT = "/shared/images/icons/streamline/core-solid";
const LOGO_ROOT = "/shared/images/icons/streamline/logos";

const NAV_ICON_PATHS: Record<SiteNavIcon, string> = {
  home: `${ICON_ROOT}/home.svg`,
  leaderboard: `${ICON_ROOT}/leaderboards.svg`,
  rewards: `${ICON_ROOT}/rewards.svg`,
  punishments: `${ICON_ROOT}/punishments.svg`,
  marketplace: `${ICON_ROOT}/marketplace.svg`,
};

function AssetIcon({ src }: { src: string }) {
  return <img className="asset-icon" src={src} alt="" draggable={false} />;
}

export function AppSidebar({
  viewer = null,
}: {
  viewer?: Viewer | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const quickLinks = viewer
    ? [
        ["My profile", "/profile"],
        ["Following", "/following"],
        ["Notifications", "/notifications"],
        ["My team", "/team"],
      ]
    : [];

  return (
    <>
      <aside className="site-sidebar">
        <div className="sidebar-head">
          <a className="sidebar-brand" href="/" aria-label="Mineacle home">
            <span className="sidebar-brand__mark">
              <img src="/shared/images/branding/mineacle-mark.png" alt="" />
            </span>
            <img
              className="sidebar-brand__wordmark"
              src="/shared/images/branding/mineacle-logo.png"
              alt="Mineacle"
            />
          </a>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {siteNavigation.map((item) => (
            <a
              className={`sidebar-nav__item ${
                item.href === "/" ? "is-active" : ""
              }`}
              href={item.href}
              key={item.label}
              {...(item.external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
            >
              <span className="sidebar-nav__icon">
                <AssetIcon src={NAV_ICON_PATHS[item.icon]} />
              </span>
              <span className="sidebar-nav__label">{item.label}</span>
              {item.external ? (
                <span className="sidebar-nav__external">↗</span>
              ) : null}
            </a>
          ))}
        </nav>

        {viewer ? (
          <div className="sidebar-quick">
            <small>MY MINEACLE</small>
            {quickLinks.map(([label, href]) => (
              <a href={href} key={href}>
                <span>{label}</span>
                {href === "/notifications" &&
                viewer.unreadNotifications > 0 ? (
                  <b>{viewer.unreadNotifications}</b>
                ) : null}
              </a>
            ))}
          </div>
        ) : null}

        <div className="sidebar-spacer" />

        <div className="sidebar-actions">
          <div className="sidebar-socials">
            <a className="sidebar-social-link" href="#">
              <span className="sidebar-social-link__icon">
                <AssetIcon src={`${LOGO_ROOT}/discord.png`} />
              </span>
              <span className="sidebar-social-link__label">Discord</span>
            </a>
            <a className="sidebar-social-link" href="#">
              <span className="sidebar-social-link__icon">
                <AssetIcon src={`${LOGO_ROOT}/x.svg`} />
              </span>
              <span className="sidebar-social-link__label">X</span>
            </a>
          </div>

          <a
            className="sidebar-account-action"
            href={viewer ? "/profile" : "/login"}
          >
            <span className="sidebar-account-action__icon">
              {viewer ? (
                <span className="rail-user">
                  {viewer.username.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <AssetIcon src={`${ICON_ROOT}/user.svg`} />
              )}
            </span>
            <span className="sidebar-account-action__copy">
              <small>{viewer ? "Verified player" : "Player account"}</small>
              <strong>{viewer ? viewer.username : "Log in / Sign up"}</strong>
            </span>
            <span className="sidebar-account-action__arrow">→</span>
          </a>
        </div>
      </aside>

      <header className="mobile-header">
        <button
          className="mobile-menu-button"
          onClick={() => setMobileOpen((value) => !value)}
          type="button"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        >
          <span className="menu-icon">
            <span />
            <span />
            <span />
          </span>
        </button>

        <a className="mobile-brand" href="/">
          <img src="/shared/images/branding/mineacle-mark.png" alt="Mineacle" />
        </a>

        <a
          className="mobile-account-button"
          href={viewer ? "/profile" : "/login"}
        >
          {viewer ? viewer.username : "Log in"}
        </a>
      </header>
    </>
  );
}
