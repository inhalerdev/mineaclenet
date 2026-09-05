"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import styles from "./PlayerSearch.module.css";

const SEARCH_ICON =
  "/shared/images/icons/streamline/core-solid/search.png";

type PlayerSearchResult = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
  teamName: string | null;
};

type PlayerSearchProps = {
  className?: string;
  placeholder?: string;
};

export function PlayerSearch({
  className,
  placeholder = "Search for a player",
}: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (!/^[A-Za-z0-9_]{2,16}$/.test(trimmed)) {
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

    if (players[0]) {
      window.location.assign(
        `/player/${encodeURIComponent(players[0].username)}`,
      );
    }
  }

  const rootClass = [styles.root, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} ref={rootRef}>
      <form
        className={styles.form}
        onSubmit={submit}
        role="search"
      >
        <img
          className={styles.searchIcon}
          src={SEARCH_ICON}
          alt=""
          draggable={false}
        />

        <input
          aria-label="Search for a Mineacle player"
          aria-expanded={open}
          autoComplete="off"
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
        />

        {searching ? (
          <span className={styles.searching}>SEARCHING</span>
        ) : null}
      </form>

      {open && query.trim().length >= 2 ? (
        <div className={styles.results}>
          {players.length > 0 ? (
            players.map((player) => (
              <a
                className={styles.result}
                href={`/player/${encodeURIComponent(player.username)}`}
                key={player.uuid}
              >
                <PlayerAvatar
                  uuid={player.uuid}
                  size={32}
                  className={styles.avatar}
                />

                <span className={styles.identity}>
                  <strong>
                    {player.displayName || player.username}
                  </strong>
                  <small>
                    {player.teamName
                      ? `${player.username} · ${player.teamName}`
                      : player.username}
                  </small>
                </span>

                <span
                  className={`${styles.status} ${
                    player.online ? styles.online : ""
                  }`}
                >
                  <i aria-hidden="true" />
                  {player.online ? "ONLINE" : "OFFLINE"}
                </span>
              </a>
            ))
          ) : !searching ? (
            <div className={styles.empty}>
              No Mineacle players found
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
