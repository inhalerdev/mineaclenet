import { memoryCache } from "@/shared/server/memory-cache";
import { homeContent } from "./home-content";

/*
 * Member and online counts for the homepage Discord card, read from
 * Discord's public invite info (no bot or login needed). Kept in memory for
 * 5 minutes so visitors never wait on Discord. null = no invite set, or
 * Discord couldn't be reached yet (the card then shows without numbers).
 */
export type DiscordStats = {
  members: number;
  online: number;
};

const TIMEOUT_MS = 1_500;

/* Last good numbers, kept if a later lookup fails. */
let lastGood: DiscordStats | null = null;

/* "https://discord.gg/abc123" or ".../invite/abc123" -> "abc123". */
export function discordInviteCode(invite: string) {
  const match = invite
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]{2,32})\/?$/);

  return match ? match[1] : "";
}

async function fetchDiscordStats(): Promise<DiscordStats | null> {
  const code = discordInviteCode(homeContent.discord.invite);

  if (!code) {
    return null;
  }

  const response = await fetch(
    `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`,
    {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`Discord invite lookup failed (${response.status})`);
  }

  const data = (await response.json()) as {
    approximate_member_count?: unknown;
    approximate_presence_count?: unknown;
  };
  const members = Number(data.approximate_member_count);
  const online = Number(data.approximate_presence_count);

  if (!Number.isFinite(members) || members <= 0) {
    return null;
  }

  return {
    members: Math.floor(members),
    online: Number.isFinite(online) && online > 0 ? Math.floor(online) : 0,
  };
}

/* Never throws: a failed lookup keeps the last numbers (or none) until the
   next try 5 minutes later, so a slow Discord can't slow the homepage. */
async function loadDiscordStats(): Promise<DiscordStats | null> {
  try {
    const stats = await fetchDiscordStats();
    lastGood = stats ?? lastGood;
    return stats ?? lastGood;
  } catch (error) {
    console.error("[mineacle-home] Could not load Discord counts", error);
    return lastGood;
  }
}

export const getDiscordStats = memoryCache<DiscordStats | null>(
  5 * 60_000,
  loadDiscordStats,
  null,
);
