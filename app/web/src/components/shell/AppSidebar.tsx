import { homeNavigation, type HomeNavIcon } from "@/lib/home-content";
import { PlayButton } from "@/components/ui/PlayButton";

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

  if (icon === "vote") {
    return (
      <svg {...common}>
        <path d="m12 3 2.4 4.8 5.3.8-3.8 3.7.9 5.3L12 15.1 7.2 17.6l.9-5.3-3.8-3.7 5.3-.8L12 3Z" />
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

export function AppSidebar() {
  return (
    <>
      <aside className="site-sidebar">
        <a className="sidebar-brand" href="/" aria-label="Mineacle home">
          <img src="/mineacle-logo.png" alt="Mineacle" />
        </a>

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
          <PlayButton address="mineacle.net" compact />
          <a className="sidebar-community" href="#">
            <span className="sidebar-community__mark" aria-hidden="true">#</span>
            <span>
              <small>Community</small>
              <strong>Join Discord</strong>
            </span>
          </a>
          <a className="sidebar-account" href="/login">
            <span className="sidebar-account__avatar" aria-hidden="true" />
            <span>
              <small>Mineacle Account</small>
              <strong>Log in / Sign up</strong>
            </span>
          </a>
        </div>
      </aside>

      <header className="mobile-header">
        <a href="/" aria-label="Mineacle home">
          <img src="/mineacle-logo.png" alt="Mineacle" />
        </a>
        <div className="mobile-header__actions">
          <PlayButton address="mineacle.net" compact />
          <a className="mobile-account-button" href="/login" aria-label="Log in or sign up">
            <span aria-hidden="true" />
          </a>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {homeNavigation.map((item, index) => (
          <a
            className={index === 0 ? "is-active" : ""}
            href={item.href}
            key={item.label}
            {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            <NavIcon icon={item.icon} />
            <span>{item.label === "Leaderboards" ? "Leaders" : item.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
