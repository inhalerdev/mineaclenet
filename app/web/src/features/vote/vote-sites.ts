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
];

/* What one vote is worth in-game. */
export const voteReward = "Vote Crate Key";

/* "Minecraft-MP.com" -> "minecraftmpcom", so small spelling differences
   between sites don't matter. */
function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* The site a vote came from, by the service name the server saved. */
export function matchVoteSite(service: string): VoteSite | undefined {
  const name = normalize(service);

  if (!name) {
    return undefined;
  }

  return voteSites.find((site) =>
    [site.domain.replace(/\.[a-z]+$/i, ""), site.domain, site.name, ...(site.services ?? [])]
      .map(normalize)
      .some((key) => key && name.startsWith(key)),
  );
}
