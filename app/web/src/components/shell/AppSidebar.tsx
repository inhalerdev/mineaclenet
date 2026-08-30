"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import {
  siteNavigation,
  type SiteNavIcon,
} from "@/shared/navigation/site-navigation";

const NAV_ICON_PATHS: Record<SiteNavIcon, string> = {
  home: "/shared/images/icons/navigation/home.png",
  leaderboard: "/shared/images/icons/navigation/leaderboards.png",
  rewards: "/shared/images/icons/navigation/rewards.png",
  punishments: "/shared/images/icons/navigation/punishments.png",
  marketplace: "/shared/images/icons/navigation/marketplace.png",
};

const SOCIAL_LINKS = [
  { label: "Discord", href: "#", icon: "/shared/images/social/discord.png" },
  { label: "X", href: "#", icon: "/shared/images/social/x.png" },
] as const;

function AssetIcon({ src, className = "" }: { src: string; className?: string }) {
  const style: CSSProperties = {
    WebkitMaskImage: `url("${src}")`,
    maskImage: `url("${src}")`,
  };

  return (
    <span
      aria-hidden="true"
      className={`asset-icon ${className}`.trim()}
      style={style}
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
        <AssetIcon src="/shared/images/icons/actions/close.png" />
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
              className={`sidebar-nav__item ${item.href === "/" ? "is-active" : ""}`}
              href={item.href}
              key={item.label}
              {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <span className="sidebar-nav__icon">
                <NavIcon icon={item.icon} />
              </span>
              <span className="sidebar-nav__label">{item.label}</span>
              {item.external ? <span className="sidebar-nav__external">↗</span> : null}
            </a>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-actions">
          <div className="sidebar-socials" aria-label="Mineacle social links">
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
                <span className="sidebar-social-link__label">{social.label}</span>
              </a>
            ))}
          </div>

          <a className="sidebar-account-action" href="/login">
            <span className="sidebar-account-action__icon">
              <AssetIcon src="/shared/images/icons/actions/user.png" />
            </span>
            <span className="sidebar-account-action__copy">
              <small>Player account</small>
              <strong>Log in / Sign up</strong>
            </span>
            <span className="sidebar-account-action__arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </aside>

      <a className="desktop-auth-cta" href="/login">
        <AssetIcon src="/shared/images/icons/actions/user.png" />
        <span>Log in / Sign up</span>
      </a>

      <header className="mobile-header">
        <button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="mobile-menu-button"
          onClick={() => setMobileOpen((value) => !value)}
          type="button"
        >
          <MobileMenuIcon open={mobileOpen} />
        </button>

        <a className="mobile-brand" href="/" aria-label="Mineacle home">
          <img src="/shared/images/branding/mineacle-mark.png" alt="Mineacle" />
        </a>

        <a className="mobile-account-button" href="/login">Log in</a>
      </header>

      <div className={`mobile-drawer ${mobileOpen ? "is-open" : ""}`}>
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
                className={item.href === "/" ? "is-active" : ""}
                href={item.href}
                key={item.label}
                onClick={() => setMobileOpen(false)}
                {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
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
                <a aria-label={social.label} href={social.href} key={social.label}>
                  <AssetIcon src={social.icon} />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>

            <a className="mobile-account-link" href="/login">
              <AssetIcon src="/shared/images/icons/actions/user.png" />
              <span>Log in / Sign up</span>
              <small aria-hidden="true">→</small>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
