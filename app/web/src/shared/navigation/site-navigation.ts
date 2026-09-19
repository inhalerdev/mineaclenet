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
  { label: "Vote & Rewards", href: "/vote", icon: "rewards" },
  { label: "Public Records", href: "/punishments", icon: "punishments" },
  {
    label: "Marketplace",
    href: "https://store.mineacle.net/",
    icon: "marketplace",
    external: true,
  },
];
