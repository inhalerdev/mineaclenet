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
    playerCount: "—",
  },
  hero: {
    eyebrow: "Mineacle SMP",
    title: "A world worth staying for.",
    body: "Explore, build, trade, compete, and make your mark on the season.",
    image: "",
    imageLabel: "Season artwork",
  },
  mineaclePlus: {
    eyebrow: "Monthly membership",
    title: "Mineacle+",
    body: "Support the server and unlock member benefits.",
    action: "Explore Mineacle+",
    href: "#",
    image: "",
    imageLabel: "Mineacle+ artwork",
  },
  rewards: {
    eyebrow: "Free crate keys",
    title: "Earn rewards.",
    body: "Vote for Mineacle and collect keys in game.",
    action: "Get rewards",
    href: "/vote",
    image: "",
    imageLabel: "Vote and crate key artwork",
  },
  competitive: {
    eyebrow: "Global leaderboards",
    title: "See who owns the season.",
    body: "Players, teams, K/D, and balance — all in one place.",
    action: "View leaderboards",
    href: "/leaderboards",
    image: "",
    imageLabel: "Competitive season artwork",
    categories: ["Top Players", "Top Teams", "Best K/D", "Balance"],
  },
};
