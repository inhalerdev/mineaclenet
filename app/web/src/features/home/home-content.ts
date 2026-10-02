/**
 * Large media (video) is served from Cloudflare R2.
 *
 * Set NEXT_PUBLIC_MEDIA_BASE_URL (e.g. https://media.mineacle.net) once the R2
 * bucket has a custom domain. The r2.dev fallback is rate limited by
 * Cloudflare and is meant for development only, so production should not
 * rely on it. NEXT_PUBLIC_* values are baked in at build time.
 */
const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  "https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev"
).replace(/\/+$/, "");

export const homeContent = {
  hero: {
    media: `${MEDIA_BASE_URL}/hero1.mp4`,
    // Optional still frame shown before the video starts, e.g.
    // "/images/home/hero-poster.webp". Leave empty for no poster.
    poster: process.env.NEXT_PUBLIC_HERO_POSTER_URL || "",
    mediaLabel: "Mineacle seasonal world",
  },
  // Words in the homepage hero. The live strip under the buttons (players
  // online, players joined, IP) is filled in automatically.
  heroText: {
    // Quiet status line above the headline: "OPEN BETA · <news>".
    tag: "Open Beta",
    // Short news next to it, e.g. "Season 1 starts Oct 3". `href` is
    // optional (a page to read more on). Leave `text` empty to hide it.
    news: {
      text: "Free to play on Java 1.21+",
      href: "",
    },
    // The headline, then a last word shown in brand purple.
    headline: "Fight. Trade.",
    headlineAccent: "Rise.",
    text: "Survival with 1.8-style PvP, a player-run economy and a bounty on every head. Squad up with friends and take the top spot.",
    // Words in the text shown in the in-game stat colors: the four things
    // Mineacle is about. Each must appear in `text` above.
    highlights: [
      { word: "PvP", color: "#fc1111" },
      { word: "economy", color: "#11fc7b" },
      { word: "bounty", color: "#fc8611" },
      { word: "friends", color: "#b078ff" },
    ],
  },
  // Joining the server. `javaVersion` is shown in the "how to join" steps
  // when the IP is copied, e.g. "1.21+". Leave empty to hide it.
  join: {
    address: "mineacle.net",
    javaVersion: "1.21+",
  },
  // The Discord invite (same one as /discord in game). The homepage card
  // shows the member and online counts from Discord. Leave empty to show the
  // Vote card there instead.
  discord: {
    invite: "https://discord.gg/4xrYFxdSWg",
  },
  // Quick-link card backgrounds. Empty = plain card (no image). To add art
  // later, put the file in public/images/home/ and set its path here.
  mineaclePlus: {
    media: "/images/home/marketplace.png",
    mediaLabel: "Pixel-art night market with striped stalls",
  },
  rewards: {
    media: "",
    mediaLabel: "Rewards artwork",
  },
  competitive: {
    media: "/images/home/leaderboards.png",
    mediaLabel: "Pixel-art podium with a crowned champion and a duel",
  },
  community: {
    media: "/images/home/discord.png",
    mediaLabel: "Pixel-art friends around a campfire at night",
  },
};
