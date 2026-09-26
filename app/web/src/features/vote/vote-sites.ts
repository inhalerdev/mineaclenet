/*
 * Server listing sites players can vote on. Each vote gives the player one
 * Vote Crate Key in-game (handled by the Minecraft server, not the website).
 *
 * To add or remove a site, edit this list; the vote page updates itself.
 * `href` should be the site's own vote page for Mineacle.
 */
export type VoteSite = {
  id: string;
  name: string;
  domain: string;
  href: string;
};

export const voteSites: VoteSite[] = [
  {
    id: "minecraft-server-list",
    name: "Minecraft Server List",
    domain: "minecraft-server-list.com",
    href: "https://minecraft-server-list.com/server/520903/vote/",
  },
  {
    id: "minecraftservers-org",
    name: "MinecraftServers.org",
    domain: "minecraftservers.org",
    href: "https://minecraftservers.org/vote/688676",
  },
  {
    id: "minecraft-mp",
    name: "Minecraft-MP",
    domain: "minecraft-mp.com",
    href: "https://minecraft-mp.com/server/359207/vote/",
  },
];

/* What one vote is worth in-game. */
export const voteReward = "Vote Crate Key";
