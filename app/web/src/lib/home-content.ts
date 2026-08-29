export type HomeNavIcon =
  | "home"
  | "leaderboard"
  | "vote"
  | "marketplace"
  | "punishments";

export type HomeNavItem = {
  label: string;
  href: string;
  icon: HomeNavIcon;
  external?: boolean;
};

export const homeNavigation: HomeNavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Leaderboards", href: "/leaderboards", icon: "leaderboard" },
  { label: "Vote", href: "/vote", icon: "vote" },
  { label: "Marketplace", href: "#", icon: "marketplace", external: true },
  { label: "Punishments", href: "/punishments", icon: "punishments" },
];

export const homeContent = {
  season: "Season 03",
  hero: {
    eyebrow: "Mineacle SMP",
    title: "A new world waits beyond the portal.",
    body: "Build your place in a player-driven world of economy, rivalry, exploration, and community.",
    imageLabel: "Season artwork / trailer image",
  },
  server: {
    address: "mineacle.net",
    statusLabel: "Live server status",
  },
  account: {
    eyebrow: "Your Mineacle",
    title: "One account. Your whole server story.",
    body: "Claim your player profile to follow stats, teams, rankings, and account perks.",
  },
  mineaclePlus: {
    eyebrow: "Monthly membership",
    title: "Mineacle+",
    body: "A premium way to support Mineacle and unlock member benefits.",
    imageLabel: "Mineacle+ artwork",
  },
  voting: {
    eyebrow: "Free rewards",
    title: "Vote. Earn keys.",
    body: "Support the server, collect crate keys, and open rewards in-game.",
    imageLabel: "Crate key artwork",
  },
  creator: {
    eyebrow: "Community",
    title: "Creator Spotlight",
    body: "Featured videos, streams, and media from players creating around Mineacle.",
    imageLabel: "Creator thumbnail",
  },
};
