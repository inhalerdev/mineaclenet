"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { homeNavigation, type HomeNavIcon } from "@/lib/home-content";

const navIconPaths: Record<HomeNavIcon, string> = {
  home: "/ui/icons/home.png",
  leaderboard: "/ui/icons/leaderboards.png",
  rewards: "/ui/icons/rewards.png",
  punishments: "/ui/icons/punishments.png",
  marketplace: "/ui/icons/marketplace.png",
};

function AssetIcon({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
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

function NavIcon({ icon }: { icon: HomeNavIcon }) {
  return <AssetIcon src={navIconPaths[icon]} />;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="menu-icon" aria-hidden="true">
      {open ? (
        <AssetIcon src="/ui/icons/close.png" />
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
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className={`site-sidebar ${expanded ? "is-expanded" : ""}`}>
        <div className="sidebar-head">
          <a className="sidebar-brand" href="/" aria-label="Reload Mineacle home">
            <span className="sidebar-brand__mark">
              <img src="/ui/mineacle-mark.png" alt="" />
            </span>
            <img
              className="sidebar-brand__wordmark"
              src="/mineacle-logo.png"
              alt="Mineacle"
            />
          </a>

          <button
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            className="sidebar-toggle"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            <MenuIcon open={expanded} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {homeNavigation.map((item) => (
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
              {item.external ? (
                <span className="sidebar-nav__external">↗</span>
              ) : null}
            </a>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-actions">
          <a className="sidebar-mini-action" href="#">
            <span className="sidebar-mini-action__icon" aria-hidden="true">#</span>
            <span className="sidebar-mini-action__copy">
              <small>Community</small>
              <strong>Discord</strong>
            </span>
          </a>

          <a className="sidebar-mini-action" href="/login">
            <span className="sidebar-mini-action__icon">
              <AssetIcon src="/ui/icons/user.png" />
            </span>
            <span className="sidebar-mini-action__copy">
              <small>Mineacle</small>
              <strong>Account</strong>
            </span>
          </a>
        </div>
      </aside>

      <header className="mobile-header">
        <button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="mobile-menu-button"
          onClick={() => setMobileOpen((value) => !value)}
          type="button"
        >
          <MenuIcon open={mobileOpen} />
        </button>

        <a className="mobile-brand" href="/" aria-label="Reload Mineacle home">
          <img src="/ui/mineacle-mark.png" alt="Mineacle" />
        </a>

        <a
          className="mobile-account-button"
          href="/login"
          aria-label="Mineacle account"
        >
          <AssetIcon src="/ui/icons/user.png" />
        </a>
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
            {homeNavigation.map((item) => (
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
            <a href="#">Join Discord</a>
            <a href="/login">Log in / Sign up</a>
          </div>
        </div>
      </div>
    </>
  );
}
