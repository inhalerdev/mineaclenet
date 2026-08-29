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
  server: {
    address: "mineacle.net",
    statusLabel: "Online",
    playerCount: "",
  },
  hero: {
    eyebrow: "Mineacle SMP",
    title: "A world worth staying for.",
    body: "Build, trade, compete, and make your mark.",
    image: "https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/hero-bg.mp4",
    imageLabel: "Mineacle seasonal world",
  },
  mineaclePlus: {
    eyebrow: "Monthly membership",
    title: "Mineacle+",
    body: "Extra perks for players who want more from the season.",
    action: "View Mineacle+",
    href: "#",
    image: "/home/mineacle-plus.png",
    imageLabel: "Mineacle+ showcase artwork",
  },
  rewards: {
    eyebrow: "Vote & earn",
    title: "Free crate keys.",
    body: "Vote for Mineacle and collect rewards in game.",
    action: "Earn keys",
    href: "/vote",
    image: "",
    imageLabel: "Vote and crate key artwork",
  },
  competitive: {
    eyebrow: "Global leaderboards",
    title: "Own the season.",
    body: "See the players and teams leading Mineacle.",
    action: "View rankings",
    href: "/leaderboards",
    image: "/home/leaderboards-duel-showcase.png",
    imageLabel: "Competitive duel showcase artwork",
    categories: ["Players", "Teams", "K/D", "Balance"],
  },
};
