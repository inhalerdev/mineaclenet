import { VotePage } from "@/components/vote/VotePage";
import { getCurrentViewer } from "@/features/auth/session";
import { getTopPlayers } from "@/features/players/top-players";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vote & Rewards | Mineacle",
  description:
    "Vote for Mineacle on Minecraft server lists and earn a Vote Crate Key for every vote.",
};

export default async function Vote() {
  const [viewer, topPlayers] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
  ]);

  return <VotePage viewer={viewer} topPlayers={topPlayers} />;
}
