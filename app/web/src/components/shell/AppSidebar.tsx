"use client";

import { useState } from "react";
import {
  siteNavigation,
  type SiteNavIcon,
} from "@/shared/navigation/site-navigation";

/*
 * These are normal public image assets.
 * Replace a file in public/ with the same filename and the website uses
 * the replacement automatically. The icon artwork is not embedded here.
 */
const SITE_ICON_ROOT = "/shared/images/icons/streamline/core-solid";
const SITE_LOGO_ROOT = "/shared/images/icons/streamline/logos";

const NAV_ICON_PATHS: Record<SiteNavIcon, string> = {
  home: `${SITE_ICON_ROOT}/home.svg`,
  leaderboard: `${SITE_ICON_ROOT}/leaderboards.svg`,
  rewards: `${SITE_ICON_ROOT}/rewards.svg`,
  punishments: `${SITE_ICON_ROOT}/punishments.svg`,
  marketplace: `${SITE_ICON_ROOT}/marketplace.svg`,
};

const SOCIAL_LINKS = [
  {
    label: "Discord",
    href: "#",
    icon: `${SITE_LOGO_ROOT}/discord.png`,
  },
  {
    label: "X",
    href: "#",
    icon: `${SITE_LOGO_ROOT}/x.svg`,
  },
] as const;

function AssetIcon({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  return (
    <img
      aria-hidden="true"
      alt=""
      className={`asset-icon ${className}`.trim()}
      draggable={false}
      src={src}
    />
  );
}

function NavIcon({ icon }: { icon: SiteNavIcon }) {
  return <AssetIcon src={NAV_ICON_PATHS[icon]} />;
}

function MobileMenuIcon({ open }: { open: boolean }) {
  return (
    <span className="menu-icon" aria-hidden="true">
      {open ? (
        <AssetIcon src={`${SITE_ICON_ROOT}/close.svg`} />
      ) : (
        <>
          <span />
          <span />
          <span />
        </>
      )}
    </span>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
                <NavIcon icon={item.icon} />
              </span>

              <span className="sidebar-nav__label">
                {item.label}
              </span>

              {item.external ? (
                <span className="sidebar-nav__external">↗</span>
              ) : null}
            </a>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-actions">
          <div
            className="sidebar-socials"
            aria-label="Mineacle social links"
          >
            {SOCIAL_LINKS.map((social) => (
              <a
                aria-label={social.label}
                className="sidebar-social-link"
                href={social.href}
                key={social.label}
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

          <a className="sidebar-account-action" href="/login">
            <span className="sidebar-account-action__icon">
              <AssetIcon src={`${SITE_ICON_ROOT}/user.svg`} />
            </span>

            <span className="sidebar-account-action__copy">
              <small>Player account</small>
              <strong>Log in / Sign up</strong>
            </span>

            <span
              className="sidebar-account-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </a>
        </div>
      </aside>

      <a className="desktop-auth-cta" href="/login">
        <AssetIcon src={`${SITE_ICON_ROOT}/user.svg`} />
        <span>Log in / Sign up</span>
      </a>

      <header className="mobile-header">
        <button
          aria-expanded={mobileOpen}
          aria-label={
            mobileOpen ? "Close navigation" : "Open navigation"
          }
          className="mobile-menu-button"
          onClick={() => setMobileOpen((value) => !value)}
          type="button"
        >
          <MobileMenuIcon open={mobileOpen} />
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

        <a className="mobile-account-button" href="/login">
          Log in
        </a>
      </header>

      <div
        className={`mobile-drawer ${
          mobileOpen ? "is-open" : ""
        }`}
      >
        <button
          className="mobile-drawer__scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          type="button"
        />

        <div className="mobile-drawer__panel">
          <nav aria-label="Mobile navigation">
            {siteNavigation.map((item) => (
              <a
                className={
                  item.href === "/" ? "is-active" : ""
                }
                href={item.href}
                key={item.label}
                onClick={() => setMobileOpen(false)}
                {...(item.external
                  ? {
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : {})}
              >
                <NavIcon icon={item.icon} />
                <span>{item.label}</span>
                {item.external ? <small>↗</small> : null}
              </a>
            ))}
          </nav>

          <div className="mobile-drawer__bottom">
            <div className="mobile-socials">
              {SOCIAL_LINKS.map((social) => (
                <a
                  aria-label={social.label}
                  href={social.href}
                  key={social.label}
                >
                  <AssetIcon src={social.icon} />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>

            <a
              className="mobile-account-link"
              href="/login"
            >
              <AssetIcon
                src={`${SITE_ICON_ROOT}/user.svg`}
              />
              <span>Log in / Sign up</span>
              <small aria-hidden="true">→</small>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
