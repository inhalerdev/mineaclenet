import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";
import { getLaunchStats } from "@/features/home/launch-stats";
import { getTopPlayers } from "@/features/players/top-players";

export async function HomeExperience() {
  const [viewer, topPlayers, launchStats] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
    getLaunchStats(),
  ]);

  return (
    <VisitorHome
      viewer={viewer}
      topPlayers={topPlayers}
      launchStats={launchStats}
    />
  );
}
