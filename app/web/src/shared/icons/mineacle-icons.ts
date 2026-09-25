export const MINEACLE_ICON_ROOT =
  "/shared/images/icons/mineacle";

export const mineacleIcons = {
  arrowDown: `${MINEACLE_ICON_ROOT}/arrow-down.png`,
  arrowUp: `${MINEACLE_ICON_ROOT}/arrow-up.png`,
  // Notifications: plain bell, and the bell with the red dot for unread.
  bell: `${MINEACLE_ICON_ROOT}/bell.svg`,
  bellUnread: `${MINEACLE_ICON_ROOT}/bell-unread.png`,
  check: `${MINEACLE_ICON_ROOT}/check.png`,
  close: `${MINEACLE_ICON_ROOT}/close.png`,
  copy: `${MINEACLE_ICON_ROOT}/copy.png`,
  friends: `${MINEACLE_ICON_ROOT}/friends.svg`,
  crate: `${MINEACLE_ICON_ROOT}/crate.png`,
  gift: `${MINEACLE_ICON_ROOT}/gift.png`,
  location: `${MINEACLE_ICON_ROOT}/location.png`,
  play: `${MINEACLE_ICON_ROOT}/play.png`,
  // The profile icon lives with the nav icons now.
  profile: `${MINEACLE_ICON_ROOT}/nav/profile.png`,
  search: `${MINEACLE_ICON_ROOT}/search.png`,
  socialDiscord: `${MINEACLE_ICON_ROOT}/social-discord.png`,
  socialInstagram: `${MINEACLE_ICON_ROOT}/social-instagram.png`,
  socialX: `${MINEACLE_ICON_ROOT}/social-x.png`,
  // The trophy lives with the nav icons now.
  trophy: `${MINEACLE_ICON_ROOT}/nav/trophy.png`,
} as const;

/*
 * Navigation icons (home, leaderboards, vote, bans, marketplace).
 * The site shows every nav icon 20px tall and as wide as its own shape, so
 * any PNG dropped into icons/mineacle/nav works without code changes.
 * Crop each file tight to the artwork (no empty border) so it fills the
 * full height.
 */
export const MINEACLE_NAV_ICON_ROOT = `${MINEACLE_ICON_ROOT}/nav`;

export const mineacleNavIcons = {
  home: `${MINEACLE_NAV_ICON_ROOT}/home.png`,
  leaderboards: `${MINEACLE_NAV_ICON_ROOT}/trophy.png`,
  vote: `${MINEACLE_NAV_ICON_ROOT}/heart.png`,
  bans: `${MINEACLE_NAV_ICON_ROOT}/gavel.png`,
  marketplace: `${MINEACLE_NAV_ICON_ROOT}/shop.png`,
} as const;
