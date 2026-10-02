/*
 * Server listing sites players can vote on. Each vote gives the player one
 * Vote Crate Key in-game (handled by the Minecraft server, not the website).
 *
 * To add or remove a site, edit this list; the vote page updates itself.
 * `href` should be the site's own vote page for Mineacle.
 *
 * Voting status: the Minecraft server saves every vote it receives (with the
 * site's "service name") to mineacle_web_votes, and the vote page greys out
 * a site for `cooldownHours` after a vote. The service name is matched to a
 * site by its name or domain; if a site sends something different, add it to
 * `services` (the server log shows it: "... for voting on <service name>").
 */
export type VoteSite = {
  id: string;
  name: string;
  domain: string;
  href: string;
  /* How long the site makes you wait between votes. */
  cooldownHours: number;
  /* Extra service names this site sends with its votes. */
  services?: string[];
};

export const voteSites: VoteSite[] = [
  {
    id: "minecraft-server-list",
    name: "Minecraft Server List",
    domain: "minecraft-server-list.com",
    href: "https://minecraft-server-list.com/server/520903/vote/",
    cooldownHours: 24,
  },
  {
    id: "minecraftservers-org",
    name: "MinecraftServers.org",
    domain: "minecraftservers.org",
    href: "https://minecraftservers.org/vote/688676",
    cooldownHours: 24,
  },
  {
    id: "minecraft-mp",
    name: "Minecraft-MP",
    domain: "minecraft-mp.com",
    href: "https://minecraft-mp.com/server/359207/vote/",
    cooldownHours: 24,
  },
  {
    id: "mc-servers",
    name: "MC-Servers",
    domain: "mc-servers.com",
    href: "https://mc-servers.com/vote/7135",
    cooldownHours: 24,
  },
  {
    id: "minecraft-buzz",
    name: "Minecraft.buzz",
    domain: "minecraft.buzz",
    href: "https://minecraft.buzz/vote/mineacle",
    cooldownHours: 24,
  },
  {
    // Not the same site as "Minecraft Server List" above (note the dash).
    id: "minecraft-serverlist",
    name: "Minecraft-Serverlist",
    domain: "minecraft-serverlist.com",
    href: "https://minecraft-serverlist.com/server/6617/vote",
    cooldownHours: 24,
  },
];

/* What one vote is worth in-game. */
export const voteReward = "Vote Crate Key";

/* "Minecraft-MP.com" -> "minecraftmpcom", so small spelling differences
   between sites don't matter. */
function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* Like normalize() but keeps dots and dashes, to tell apart sites whose
   names only differ by punctuation ("minecraft-server-list.com" and
   "minecraft-serverlist.com"). */
function loose(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.-]/g, "");
}

/* Names a site's votes may arrive under: its domain with and without
   .com/.org/.net, its name, and any extra `services`. (Other endings are
   kept, so "minecraft.buzz" doesn't turn into just "minecraft".) */
function siteKeys(site: VoteSite) {
  return [
    site.domain.replace(/\.(com|org|net)$/i, ""),
    site.domain,
    site.name,
    ...(site.services ?? []),
  ];
}

/* The site a vote came from, by the service name the server saved.
   First by name with punctuation kept, then by letters and digits only;
   if that second check fits more than one site, the vote isn't matched
   (add the exact service name to that site's `services` to fix it). */
export function matchVoteSite(service: string): VoteSite | undefined {
  const name = normalize(service);

  if (!name) {
    return undefined;
  }

  const raw = loose(service);
  const exact = voteSites.filter((site) =>
    siteKeys(site)
      .map(loose)
      .some((key) => key && raw.startsWith(key)),
  );

  if (exact.length) {
    // The longest matching key is the most specific one.
    return exact.sort(
      (a, b) =>
        Math.max(...siteKeys(b).map(loose).filter((key) => raw.startsWith(key)).map((key) => key.length)) -
        Math.max(...siteKeys(a).map(loose).filter((key) => raw.startsWith(key)).map((key) => key.length)),
    )[0];
  }

  const fuzzy = voteSites.filter((site) =>
    siteKeys(site)
      .map(normalize)
      .some((key) => key && name.startsWith(key)),
  );

  return fuzzy.length === 1 ? fuzzy[0] : undefined;
}
