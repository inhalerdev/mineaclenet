/*
 * Social link platforms (X, YouTube, Discord, Twitch, TikTok): their
 * username rules and how links are built. Safe to use in the browser; the
 * database side is social-links.ts.
 *
 * Only the handle is ever stored, never a link: every URL is built here from
 * a handle that passed the platform's own username rules, so a profile can
 * never point somewhere unexpected.
 */
export type SocialPlatform = "x" | "youtube" | "discord" | "twitch" | "tiktok";

export type SocialLink = {
  platform: SocialPlatform;
  handle: string;
  verified: boolean;
};

type PlatformRule = {
  label: string;
  placeholder: string;
  pattern: RegExp;
  lowercase?: boolean;
  /* How the handle is shown, e.g. "@steve". */
  display: (handle: string) => string;
  /* Profile link; Discord has none (usernames can't be linked). */
  url: ((handle: string) => string) | null;
};

export const SOCIAL_PLATFORMS: Record<SocialPlatform, PlatformRule> = {
  x: {
    label: "X",
    placeholder: "@username",
    pattern: /^[A-Za-z0-9_]{1,15}$/,
    display: (handle) => `@${handle}`,
    url: (handle) => `https://x.com/${encodeURIComponent(handle)}`,
  },
  youtube: {
    label: "YouTube",
    placeholder: "@handle",
    pattern: /^[A-Za-z0-9._-]{3,30}$/,
    display: (handle) => `@${handle}`,
    url: (handle) => `https://www.youtube.com/@${encodeURIComponent(handle)}`,
  },
  discord: {
    label: "Discord",
    placeholder: "username",
    pattern: /^[a-z0-9_.]{2,32}$/,
    lowercase: true,
    display: (handle) => handle,
    url: null,
  },
  twitch: {
    label: "Twitch",
    placeholder: "username",
    pattern: /^[A-Za-z0-9_]{4,25}$/,
    display: (handle) => handle,
    url: (handle) => `https://www.twitch.tv/${encodeURIComponent(handle)}`,
  },
  tiktok: {
    label: "TikTok",
    placeholder: "@username",
    pattern: /^[A-Za-z0-9_.]{2,24}$/,
    display: (handle) => `@${handle}`,
    url: (handle) => `https://www.tiktok.com/@${encodeURIComponent(handle)}`,
  },
};

export const SOCIAL_ORDER: SocialPlatform[] = ["x", "youtube", "discord", "twitch", "tiktok"];

export function isSocialPlatform(value: string): value is SocialPlatform {
  return value in SOCIAL_PLATFORMS;
}

/*
 * Cleans what a player typed into just the handle: "https://x.com/Steve",
 * "x.com/Steve" and "@Steve" all become "Steve". Returns null if it isn't a
 * valid handle for that platform, "" if the box was left empty.
 */
export function normalizeHandle(platform: SocialPlatform, input: string): string | null {
  const rule = SOCIAL_PLATFORMS[platform];
  let value = input.trim();

  if (!value) {
    return "";
  }

  if (value.includes("/")) {
    const parts = value.split(/[?#]/)[0].split("/").filter(Boolean);
    value = parts[parts.length - 1] ?? "";
  }

  value = value.replace(/^@/, "");

  if (rule.lowercase) {
    value = value.toLowerCase();
  }

  return rule.pattern.test(value) ? value : null;
}
