"use client";

import { useState } from "react";
import { homeNavigation, type HomeNavIcon } from "@/lib/home-content";

function NavIcon({ icon }: { icon: HomeNavIcon }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (icon === "home") {
    return (
      <svg {...common}>
        <path d="M3.5 10.5 12 3.5l8.5 7" />
        <path d="M5.5 9.5V20h13V9.5" />
        <path d="M9.5 20v-6h5v6" />
      </svg>
    );
  }

  if (icon === "leaderboard") {
    return (
      <svg {...common}>
        <path d="M5 20v-6h4v6" />
        <path d="M10 20V8h4v12" />
        <path d="M15 20V4h4v16" />
      </svg>
    );
  }

  if (icon === "rewards") {
    return (
      <svg {...common}>
        <path d="M4 9h16v11H4z" />
        <path d="M12 9v11" />
        <path d="M3 6h18v3H3z" />
        <path d="M12 6c-1.2 0-4.2-.5-4.2-2.2C7.8 2.7 8.6 2 9.6 2 11 2 12 4.3 12 6Z" />
        <path d="M12 6c1.2 0 4.2-.5 4.2-2.2 0-1.1-.8-1.8-1.8-1.8C13 2 12 4.3 12 6Z" />
      </svg>
    );
  }

  if (icon === "marketplace") {
    return (
      <svg {...common}>
        <path d="M4 9h16l-1-4H5L4 9Z" />
        <path d="M5 9v10h14V9" />
        <path d="M9 19v-5h6v5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6l-7-3Z" />
      <path d="m9.5 9.5 5 5" />
      <path d="m14.5 9.5-5 5" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
      {open ? (
        <>
          <path d="m5 5 10 10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="m15 5-10 10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </>
      ) : (
        <>
          <path d="M4 6h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M4 10h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M4 14h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}

export function AppSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className={`site-sidebar ${expanded ? "is-expanded" : ""}`}>
        <div className="sidebar-head">
          <a className="sidebar-brand" href="/" aria-label="Mineacle home">
            <span className="sidebar-brand__mark">M</span>
            <img src="/mineacle-logo.png" alt="Mineacle" />
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
          {homeNavigation.map((item, index) => (
            <a
              className={`sidebar-nav__item ${index === 0 ? "is-active" : ""}`}
              href={item.href}
              key={item.label}
              {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <span className="sidebar-nav__icon"><NavIcon icon={item.icon} /></span>
              <span className="sidebar-nav__label">{item.label}</span>
              {item.external ? <span className="sidebar-nav__external">↗</span> : null}
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
            <span className="sidebar-account-dot" aria-hidden="true" />
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
        <a className="mobile-brand" href="/" aria-label="Mineacle home">
          <img src="/mineacle-logo.png" alt="Mineacle" />
        </a>
        <a className="mobile-account-button" href="/login" aria-label="Mineacle account">
          <span aria-hidden="true" />
        </a>
      </header>

      <div className={`mobile-drawer ${mobileOpen ? "is-open" : ""}`}>
        <button className="mobile-drawer__scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" type="button" />
        <div className="mobile-drawer__panel">
          <nav aria-label="Mobile navigation">
            {homeNavigation.map((item, index) => (
              <a
                className={index === 0 ? "is-active" : ""}
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
