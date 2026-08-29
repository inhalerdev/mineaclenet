export type SiteNavIcon =
  | "home"
  | "leaderboard"
  | "rewards"
  | "punishments"
  | "marketplace";

export type SiteNavItem = {
  label: string;
  href: string;
  icon: SiteNavIcon;
  external?: boolean;
};

export const siteNavigation: SiteNavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Leaderboards", href: "/leaderboards", icon: "leaderboard" },
  { label: "Rewards", href: "/vote", icon: "rewards" },
  { label: "Punishments", href: "/punishments", icon: "punishments" },
  { label: "Marketplace", href: "#", icon: "marketplace", external: true },
];
