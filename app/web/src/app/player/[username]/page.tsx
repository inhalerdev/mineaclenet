import { cache } from "react";
import { notFound } from "next/navigation";
import { PlayerProfilePage } from "@/components/players/PlayerProfilePage";
import { getCurrentViewer } from "@/features/auth/session";
import { getPlayerByUsername } from "@/features/players/repository";
import { getTopPlayers } from "@/features/players/top-players";
import { isFollowing } from "@/features/social/follows";

export const dynamic = "force-dynamic";

/* Shared by the page and its title, so the player is only looked up once. */
const loadPlayer = cache((username: string) => getPlayerByUsername(username));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const player = await loadPlayer((await params).username);
  const name = player?.username || "Player";

  return {
    title: `${name} | Mineacle`,
    description: player
      ? `${name}'s Mineacle profile: balance, K/D, kills and playtime.`
      : "Player not found on Mineacle.",
  };
}

export default async function Player({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [viewer, topPlayers, player] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
    loadPlayer(username),
  ]);

  if (!player) {
    notFound();
  }

  const isSelf = Boolean(viewer && viewer.uuid === player.uuid);
  const following =
    viewer && !isSelf ? await isFollowing(viewer.accountId, player.uuid) : false;

  return (
    <PlayerProfilePage
      viewer={viewer}
      topPlayers={topPlayers}
      player={player}
      isSelf={isSelf}
      following={following}
    />
  );
}
