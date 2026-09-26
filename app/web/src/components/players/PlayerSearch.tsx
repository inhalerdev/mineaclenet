"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./PlayerSearch.module.css";

type PlayerSearchResult = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
  teamName: string | null;
};

type PlayerSearchProps = {
  className?: string;
  iconSrc?: string;
  placeholder?: string;
  variant?: "default" | "rail";
  /**
   * Show results as part of the page (e.g. inside the header search panel)
   * instead of in a floating dropdown under the box.
   */
  inline?: boolean;
  autoFocus?: boolean;
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{2,16}$/;

// Second line under a result: the username (if the display name differs)
// and the team.
function detail(player: PlayerSearchResult) {
  return [
    player.displayName && player.displayName !== player.username
      ? player.username
      : null,
    player.teamName,
  ]
    .filter(Boolean)
    .join(" · ");
}

function playerHref(username: string) {
  return `/player/${encodeURIComponent(username)}`;
}

export function PlayerSearch({
  className,
  iconSrc = mineacleIcons.search,
  placeholder = "Search for a player",
  variant = "default",
  inline = false,
  autoFocus = false,
}: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    // Inline results stay put; only the floating dropdown closes on outside
    // clicks.
    if (!inline) {
      document.addEventListener("mousedown", onPointerDown);
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [inline]);

  useEffect(() => {
    const trimmed = query.trim();
    setActiveIndex(-1);

    if (!USERNAME_PATTERN.test(trimmed)) {
      setPlayers([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(
          `/api/players/search?q=${encodeURIComponent(trimmed)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          setPlayers([]);
          return;
        }

        const data = (await response.json()) as {
          players?: PlayerSearchResult[];
        };

        setPlayers((data.players || []).slice(0, 6));
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setPlayers([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function submit(event: FormEvent) {
    event.preventDefault();

    const player = players[activeIndex] ?? players[0];

    if (player) {
      window.location.assign(playerHref(player.username));
    }
  }

  // Up / down arrows move through the results; Enter opens the highlighted one.
  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!players.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % players.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        index <= 0 ? players.length - 1 : index - 1,
      );
    }
  }

  const trimmed = query.trim();
  const showResults = open && trimmed.length >= 2;
  const validQuery = USERNAME_PATTERN.test(trimmed);
  const resultsId = `${variant}-player-search-results`;

  const rootClass = [
    styles.root,
    variant === "rail" ? styles.railRoot : "",
    inline ? styles.inlineRoot : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClass}
      ref={rootRef}
      data-search-variant={variant}
      data-has-query={showResults ? "true" : undefined}
    >
      <form className={styles.form} onSubmit={submit} role="search">
        <img
          className={styles.searchIcon}
          src={iconSrc}
          alt=""
          draggable={false}
        />

        <input
          aria-label="Search for a Mineacle player"
          aria-expanded={showResults}
          aria-controls={resultsId}
          aria-activedescendant={
            activeIndex >= 0 ? `${resultsId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={16}
          placeholder={placeholder}
          spellCheck={false}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setOpen(true);
            }
          }}
          onKeyDown={onInputKeyDown}
        />

        {searching ? (
          <span className={styles.searching} role="status">
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <span className={styles.srOnly}>Searching</span>
          </span>
        ) : null}
      </form>

      {showResults ? (
        <div className={styles.results} id={resultsId} data-player-results>
          {players.length > 0 ? (
            players.map((player, index) => (
              <a
                className={styles.result}
                data-active={index === activeIndex}
                id={`${resultsId}-${index}`}
                href={playerHref(player.username)}
                key={player.uuid}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <PlayerAvatar
                  uuid={player.uuid}
                  size={64}
                  className={styles.avatar}
                />

                <span className={styles.identity}>
                  <strong>{player.displayName || player.username}</strong>
                  {detail(player) ? <small>{detail(player)}</small> : null}
                </span>

                <span className={styles.status} data-online={player.online}>
                  {player.online ? "Online" : "Offline"}
                </span>
              </a>
            ))
          ) : !searching ? (
            <p className={styles.empty}>
              {validQuery
                ? `No players named "${trimmed}" have joined Mineacle yet.`
                : "Usernames can only contain letters, numbers and underscores."}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
