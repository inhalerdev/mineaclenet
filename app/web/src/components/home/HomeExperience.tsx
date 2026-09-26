import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";
import { getHeroStats } from "@/features/home/hero-stats";
import { getTopPlayers } from "@/features/players/top-players";

export async function HomeExperience() {
  const [viewer, topPlayers, heroStats] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
    getHeroStats(),
  ]);

  return (
    <VisitorHome
      viewer={viewer}
      topPlayers={topPlayers}
      heroStats={heroStats}
    />
  );
}
