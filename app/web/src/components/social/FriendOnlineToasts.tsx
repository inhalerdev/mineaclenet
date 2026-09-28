"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import type { OnlineFriend } from "@/features/social/follows";
import styles from "./FriendOnlineToasts.module.css";
import { RankPrefix } from "@/components/players/RankPrefix";
import { useToastRoot } from "@/components/site/useToastRoot";

/*
 * Xbox-style pop-up at the bottom of the screen when a player you follow
 * comes online in game: their head, "Friend online", their name and the
 * world they're in. Stays for about 6 seconds, then slides away; click it
 * to open their profile. Each one is also saved to your notifications.
 *
 * Checks /api/friends/online every 30 seconds while the tab is visible.
 * Friends who were already online when you opened the site don't pop up;
 * only ones who join while you're here do. What's been seen is kept for this
 * tab (sessionStorage), so moving between pages doesn't repeat pop-ups.
 * Several friends joining together are shown one after another.
 *
 * Drawn into the shared pop-up area at the bottom of the screen
 * (site/useToastRoot.ts), so it stacks with other pop-ups.
 */
const POLL_EVERY_MS = 30_000;
const SHOW_MS = 6_000;
const LEAVE_MS = 320;
const SEEN_KEY = "mineacle:friends-online";

function readSeen(): Set<string> | null {
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeSeen(uuids: string[]) {
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(uuids));
  } catch {
    // Private mode or storage off: pop-ups just may repeat after a reload.
  }
}

export function FriendOnlineToasts() {
  const [queue, setQueue] = useState<OnlineFriend[]>([]);
  const [leaving, setLeaving] = useState(false);
  const seenRef = useRef<Set<string> | null>(null);
  const toastRoot = useToastRoot();

  // Poll for online friends.
  useEffect(() => {
    let stopped = false;
    seenRef.current = readSeen();

    async function check() {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const response = await fetch("/api/friends/online", { cache: "no-store" });

        if (!response.ok || stopped) {
          return;
        }

        const data = (await response.json()) as { online?: OnlineFriend[] };
        const online = data.online ?? [];
        const previous = seenRef.current;

        // First check in this tab: remember who's on, don't pop up.
        if (previous) {
          const joined = online.filter((friend) => !previous.has(friend.uuid));

          if (joined.length) {
            setQueue((current) => [...current, ...joined]);

            // Also keep them in the notifications list.
            void fetch("/api/friends/online", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ uuids: joined.map((friend) => friend.uuid) }),
            }).catch(() => undefined);
          }
        }

        seenRef.current = new Set(online.map((friend) => friend.uuid));
        writeSeen([...seenRef.current]);
      } catch {
        // Try again next time.
      }
    }

    void check();
    const timer = window.setInterval(check, POLL_EVERY_MS);
    document.addEventListener("visibilitychange", check);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  // Show the first friend in the queue, then move on to the next.
  const current = queue[0];

  useEffect(() => {
    if (!current) {
      return;
    }

    setLeaving(false);
    const leaveTimer = window.setTimeout(() => setLeaving(true), SHOW_MS);
    return () => window.clearTimeout(leaveTimer);
  }, [current]);

  useEffect(() => {
    if (!leaving) {
      return;
    }

    const doneTimer = window.setTimeout(() => {
      setQueue((items) => items.slice(1));
      setLeaving(false);
    }, LEAVE_MS);

    return () => window.clearTimeout(doneTimer);
  }, [leaving]);

  if (!current || !toastRoot) {
    return null;
  }

  return createPortal(
    <div className={styles.region} role="status" aria-live="polite">
      <a
        key={current.uuid}
        className={styles.toast}
        data-leaving={leaving || undefined}
        href={`/player/${encodeURIComponent(current.username)}`}
      >
        <img
          className={styles.head}
          src={playerAvatarUrl(current.uuid, 64)}
          alt=""
          referrerPolicy="no-referrer"
        />
        <span className={styles.copy}>
          <span className={styles.kicker}>
            <i aria-hidden="true" />
            Friend online
          </span>
          <strong>
            <RankPrefix rankKey={current.rankKey} />
            {current.displayName || current.username}
          </strong>
          {current.world ? <small>Playing in {current.world}</small> : null}
        </span>
        {queue.length > 1 ? (
          <span className={styles.more} aria-label={`${queue.length - 1} more`}>
            +{queue.length - 1}
          </span>
        ) : null}
      </a>
    </div>,
    toastRoot,
  );
}
