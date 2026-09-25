export const MINEACLE_ICON_ROOT =
  "/shared/images/icons/mineacle";

export const mineacleIcons = {
  arrowDown: `${MINEACLE_ICON_ROOT}/arrow-down.png`,
  arrowUp: `${MINEACLE_ICON_ROOT}/arrow-up.png`,
  check: `${MINEACLE_ICON_ROOT}/check.png`,
  close: `${MINEACLE_ICON_ROOT}/close.png`,
  copy: `${MINEACLE_ICON_ROOT}/copy.png`,
  crate: `${MINEACLE_ICON_ROOT}/crate.png`,
  gavel: `${MINEACLE_ICON_ROOT}/gavel.png`,
  gift: `${MINEACLE_ICON_ROOT}/gift.png`,
  home: `${MINEACLE_ICON_ROOT}/home.png`,
  location: `${MINEACLE_ICON_ROOT}/location.png`,
  marketplace: `${MINEACLE_ICON_ROOT}/marketplace.png`,
  play: `${MINEACLE_ICON_ROOT}/play.png`,
  profile: `${MINEACLE_ICON_ROOT}/profile.png`,
  search: `${MINEACLE_ICON_ROOT}/search.png`,
  socialDiscord: `${MINEACLE_ICON_ROOT}/social-discord.png`,
  socialInstagram: `${MINEACLE_ICON_ROOT}/social-instagram.png`,
  socialX: `${MINEACLE_ICON_ROOT}/social-x.png`,
  trophy: `${MINEACLE_ICON_ROOT}/trophy.png`,
} as const;

/*
 * Navigation icons (home, leaderboards, vote, bans, marketplace).
 * All drawn on the same pixel grid and cropped to one 24 x 20 box so they
 * share a baseline. Show them at exactly 24 x 20 CSS pixels (1 art-pixel per
 * screen pixel); other sizes make pixel art look uneven.
 */
export const MINEACLE_NAV_ICON_ROOT = `${MINEACLE_ICON_ROOT}/nav`;

export const mineacleNavIcons = {
  home: `${MINEACLE_NAV_ICON_ROOT}/home.png`,
  leaderboards: `${MINEACLE_NAV_ICON_ROOT}/trophy.png`,
  vote: `${MINEACLE_NAV_ICON_ROOT}/heart.png`,
  bans: `${MINEACLE_NAV_ICON_ROOT}/gavel.png`,
  marketplace: `${MINEACLE_NAV_ICON_ROOT}/shop.png`,
} as const;
