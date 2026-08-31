"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Viewer } from "@/features/auth/types";
import {
  siteNavigation,
  type SiteNavIcon,
  type SiteNavItem,
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

const SOCIAL_LINKS = [
  {
    label: "Discord",
    href: "#",
    icon: `${LOGO_ROOT}/discord.svg`,
  },
  {
    label: "X",
    href: "#",
    icon: `${LOGO_ROOT}/x.svg`,
  },
] as const;

function AssetIcon({ src }: { src: string }) {
  return <img className="asset-icon" src={src} alt="" draggable={false} />;
}

function navItemIsActive(pathname: string, item: SiteNavItem) {
  if (item.external || !item.href.startsWith("/")) {
    return false;
  }

  if (item.href === "/") {
    return pathname === "/";
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppSidebar({
  viewer = null,
}: {
  viewer?: Viewer | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const quickLinks = viewer
    ? [
        ["My profile", "/profile"],
        ["Following", "/following"],
        ["Notifications", "/notifications"],
        ["My team", "/team"],
      ]
    : [];

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <aside className="site-sidebar">
        <div className="sidebar-head">
          <a className="sidebar-brand" href="/" aria-label="Mineacle home">
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
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {siteNavigation.map((item) => {
            const active = navItemIsActive(pathname, item);

            return (
              <a
                aria-current={active ? "page" : undefined}
                className={`sidebar-nav__item ${
                  active ? "is-active" : ""
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
            );
          })}
        </nav>

        {viewer ? (
          <div className="sidebar-quick">
            <small>MY MINEACLE</small>
            {quickLinks.map(([label, href]) => (
              <a
                aria-current={pathname === href ? "page" : undefined}
                href={href}
                key={href}
              >
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
            {SOCIAL_LINKS.map((social) => (
              <a
                className="sidebar-social-link"
                href={social.href}
                key={social.label}
                aria-label={social.label}
              >
                <span className="sidebar-social-link__icon">
                  <AssetIcon src={social.icon} />
                </span>
                <span className="sidebar-social-link__label">
                  {social.label}
                </span>
              </a>
            ))}
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
              <small>
                {viewer ? "Verified player" : "Player account"}
              </small>
              <strong>
                {viewer ? viewer.username : "Log in / Sign up"}
              </strong>
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
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        >
          <span className="menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <a className="mobile-brand" href="/" aria-label="Mineacle home">
          <img
            src="/shared/images/branding/mineacle-mark.png"
            alt="Mineacle"
          />
        </a>

        <a
          className="mobile-account-button"
          href={viewer ? "/profile" : "/login"}
        >
          {viewer ? viewer.username : "Log in"}
        </a>
      </header>

      <div className={`mobile-drawer ${mobileOpen ? "is-open" : ""}`}>
        <button
          className="mobile-drawer__scrim"
          onClick={closeMobile}
          type="button"
          aria-label="Close navigation"
        />

        <aside className="mobile-drawer__panel" aria-label="Mobile navigation">
          <nav>
            {siteNavigation.map((item) => {
              const active = navItemIsActive(pathname, item);

              return (
                <a
                  aria-current={active ? "page" : undefined}
                  className={active ? "is-active" : ""}
                  href={item.href}
                  key={item.label}
                  onClick={closeMobile}
                  {...(item.external
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  <AssetIcon src={NAV_ICON_PATHS[item.icon]} />
                  <span>{item.label}</span>
                  {item.external ? <small>↗</small> : null}
                </a>
              );
            })}
          </nav>

          {viewer ? (
            <div className="mobile-drawer__section">
              <small>MY MINEACLE</small>
              <nav>
                {quickLinks.map(([label, href]) => (
                  <a
                    aria-current={pathname === href ? "page" : undefined}
                    href={href}
                    key={href}
                    onClick={closeMobile}
                  >
                    <span />
                    <span>{label}</span>
                    {href === "/notifications" &&
                    viewer.unreadNotifications > 0 ? (
                      <small>{viewer.unreadNotifications}</small>
                    ) : null}
                  </a>
                ))}
              </nav>
            </div>
          ) : null}

          <div className="mobile-drawer__bottom">
            <div className="mobile-drawer__socials">
              {SOCIAL_LINKS.map((social) => (
                <a href={social.href} key={social.label}>
                  <AssetIcon src={social.icon} />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>

            <a
              className="mobile-drawer__account"
              href={viewer ? "/profile" : "/login"}
              onClick={closeMobile}
            >
              {viewer ? (
                <span className="rail-user">
                  {viewer.username.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <AssetIcon src={`${ICON_ROOT}/user.svg`} />
              )}
              <span>
                {viewer ? viewer.username : "Log in / Sign up"}
              </span>
              <small>→</small>
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
