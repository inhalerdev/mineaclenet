import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";
import { getTopPlayers } from "@/features/players/top-players";

export async function HomeExperience() {
  const [viewer, topPlayers] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
  ]);

  return <VisitorHome viewer={viewer} topPlayers={topPlayers} />;
}
