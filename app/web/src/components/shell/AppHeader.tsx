const primaryLinks = ["Home", "Players", "Teams", "Leaderboards"];

export function AppHeader() {
  return (
    <header className="site-header">
      <a className="site-header__brand" href="/" aria-label="Mineacle home">
        <span className="wire-logo" aria-hidden="true" />
        <span>Mineacle</span>
      </a>

      <nav className="site-header__nav" aria-label="Primary navigation">
        {primaryLinks.map((label) => (
          <a href="#" key={label}>
            {label}
          </a>
        ))}
      </nav>

      <form className="site-header__search" role="search">
        <label className="sr-only" htmlFor="global-player-search">
          Search players
        </label>
        <input
          id="global-player-search"
          name="q"
          placeholder="Search player"
          type="search"
        />
      </form>

      <div className="site-header__actions">
        <span className="status-dot" aria-hidden="true" />
        <span className="site-header__status">Server status</span>
        <a className="wire-button wire-button--small" href="#">
          Account
        </a>
      </div>
    </header>
  );
}
