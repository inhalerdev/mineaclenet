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
  // Words in the homepage hero. The stat tiles under Play Now (players
  // online, unique players, #1 player) are filled in automatically.
  heroText: {
    tag: "Open Beta",
    // Second tag next to it. Leave empty to hide it.
    subtag: "Now open for Java Edition",
    headline: "Build. Trade. Fight.",
    text: "A survival world with a player-run economy and PvP.",
  },
  // Quick-link card backgrounds. Empty = plain card (no image). To add art
  // later, put the file in public/images/home/ and set its path here.
  mineaclePlus: {
    media: "",
    mediaLabel: "Mineacle+ showcase artwork",
  },
  rewards: {
    media: "",
    mediaLabel: "Rewards artwork",
  },
  competitive: {
    media: "",
    mediaLabel: "Competitive leaderboard showcase artwork",
  },
};
