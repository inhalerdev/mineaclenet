"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import { usePlayerSuggestions } from "@/components/players/usePlayerSuggestions";
import block from "@/components/site/BlockButton.module.css";
import styles from "./FollowPlayer.module.css";

type Message = { tone: "ok" | "error"; text: string } | null;

/*
 * "Follow a player" box on /following. Suggests players while you type
 * (same search as the header); pick one with a click, or the arrow keys and
 * Enter, to follow them. Typing a full name and pressing Follow works too.
 * Players you already follow (and yourself) are shown but can't be picked.
 */
export function FollowPlayer({
  viewerUuid,
  followingUuids,
}: {
  viewerUuid: string;
  followingUuids: string[];
}) {
  const [username, setUsername] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const { players, searching } = usePlayerSuggestions(username);
  const rootRef = useRef<HTMLDivElement>(null);

  const following = new Set(followingUuids);
  const unavailable = (uuid: string) => uuid === viewerUuid || following.has(uuid);
  const showSuggestions = open && username.trim().length >= 2 && players.length > 0;

  // Close the list when clicking elsewhere or pressing Escape.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [username]);

  async function follow(name: string) {
    if (busy || !name.trim()) {
      return;
    }

    setBusy(true);
    setOpen(false);
    setMessage(null);

    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: name.trim() }),
      });

      const data = (await response.json()) as {
        error?: string;
        player?: { username: string };
      };

      if (!response.ok) {
        setMessage({ tone: "error", text: data.error || "Unable to follow that player" });
        return;
      }

      setMessage({ tone: "ok", text: `Following ${data.player?.username || name}` });
      setUsername("");
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      setMessage({ tone: "error", text: "Unable to connect to Mineacle" });
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();

    const picked = showSuggestions ? players[activeIndex] : undefined;

    if (picked && !unavailable(picked.uuid)) {
      void follow(picked.username);
    } else {
      void follow(username);
    }
  }

  // Up / down arrows move through the suggestions; Enter follows the
  // highlighted one; Escape closes the list.
  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!players.length || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) {
      return;
    }

    event.preventDefault();
    setOpen(true);
    setActiveIndex((index) =>
      event.key === "ArrowDown"
        ? (index + 1) % players.length
        : index <= 0
          ? players.length - 1
          : index - 1,
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="follow-player" className={styles.srOnly}>
            Minecraft username
          </label>
          <input
            id="follow-player"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="follow-suggestions"
            aria-activedescendant={
              showSuggestions && activeIndex >= 0
                ? `follow-suggestion-${activeIndex}`
                : undefined
            }
            placeholder="Follow a player by username"
            maxLength={16}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            required
          />
          {searching ? <span className={styles.searching} aria-hidden="true" /> : null}

          {showSuggestions ? (
            <ul className={styles.suggestions} id="follow-suggestions" role="listbox">
              {players.map((player, index) => {
                const isYou = player.uuid === viewerUuid;
                const already = following.has(player.uuid);

                return (
                  <li
                    key={player.uuid}
                    id={`follow-suggestion-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    aria-disabled={isYou || already || undefined}
                    className={styles.suggestion}
                    data-active={index === activeIndex || undefined}
                    data-disabled={isYou || already || undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    // mousedown, not click, so the input doesn't lose focus
                    // (and close the list) before the pick registers.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      if (!isYou && !already) {
                        void follow(player.username);
                      }
                    }}
                  >
                    <img
                      src={playerAvatarUrl(player.uuid, 64)}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <span className={styles.identity}>
                      <strong>{player.displayName || player.username}</strong>
                      <small data-online={player.online || undefined}>
                        {player.online ? "Online" : player.teamName || "Offline"}
                      </small>
                    </span>
                    <span className={styles.action}>
                      {isYou ? "You" : already ? "Following" : "Follow"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <button className={`${block.button} ${block.primary}`} disabled={busy} type="submit">
          {busy ? "Adding..." : "Follow"}
        </button>
      </form>

      {message ? (
        <p
          className={styles.message}
          data-tone={message.tone}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
