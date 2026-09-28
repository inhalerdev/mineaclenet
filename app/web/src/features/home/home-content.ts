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
    tag: "Open Beta",
    // Second tag next to it. Leave empty to hide it.
    subtag: "Now open for Java Edition",
    // The headline, then a last word shown in brand purple.
    headline: "Fight. Trade.",
    headlineAccent: "Rise.",
    text: "Survive the wild, battle for every block and trade your way to the richest name on the server. Legends aren't made alone, so bring your friends.",
    // The four things Mineacle is about. Colors are the in-game stat colors.
    pillars: [
      { icon: "sword" as const, label: "PvP", detail: "Fight for turf", color: "#fc1111" },
      { icon: "heart" as const, label: "Survival", detail: "Tame the wild", color: "#fc8611" },
      { icon: "emerald" as const, label: "Trade", detail: "Top the market", color: "#11fc7b" },
      { icon: "friends" as const, label: "Friends", detail: "Build together", color: "#b078ff" },
    ],
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
