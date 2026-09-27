"use client";

import { useEffect, useState } from "react";

/*
 * Player name suggestions while typing, shared by the header search
 * (PlayerSearch.tsx) and the Follow box on /following (FollowPlayer.tsx).
 *
 * Waits until typing pauses (180 ms), then asks /api/players/search. Only
 * the newest request counts: older ones are cancelled.
 */
export type PlayerSuggestion = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
  teamName: string | null;
  /* LuckPerms group, for the rank prefix. */
  rankKey?: string;
};

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{2,16}$/;

export function usePlayerSuggestions(query: string, limit = 6) {
  const [players, setPlayers] = useState<PlayerSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

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
          { cache: "no-store", signal: controller.signal },
        );

        if (!response.ok) {
          setPlayers([]);
          return;
        }

        const data = (await response.json()) as { players?: PlayerSuggestion[] };
        setPlayers((data.players || []).slice(0, limit));
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
  }, [query, limit]);

  return { players, searching };
}
