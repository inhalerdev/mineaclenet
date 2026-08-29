export type HomeNavIcon =
  | "home"
  | "leaderboard"
  | "rewards"
  | "punishments"
  | "marketplace";

export type HomeNavItem = {
  label: string;
  href: string;
  icon: HomeNavIcon;
  external?: boolean;
};

export const homeNavigation: HomeNavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Leaderboards", href: "/leaderboards", icon: "leaderboard" },
  { label: "Rewards", href: "/vote", icon: "rewards" },
  { label: "Punishments", href: "/punishments", icon: "punishments" },
  { label: "Marketplace", href: "#", icon: "marketplace", external: true },
];

export const homeContent = {
  season: "Season 03",
  hero: {
    eyebrow: "Mineacle SMP",
    title: "A new world waits beyond the portal.",
    body: "Build your place in a player-driven world of economy, rivalry, exploration, and community.",
    imageLabel: "Season artwork / trailer image",
    slides: ["Season", "Lore", "Creator"],
  },
  server: {
    address: "mineacle.net",
    statusLabel: "Online",
  },
  mineaclePlus: {
    eyebrow: "Monthly membership",
    title: "Mineacle+",
    body: "Support Mineacle and unlock member benefits.",
    imageLabel: "Mineacle+ artwork",
  },
  rewards: {
    eyebrow: "Free crate keys",
    title: "Vote & earn.",
    body: "Support the server and collect keys for in-game rewards.",
    imageLabel: "Crate key artwork",
  },
};
