import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";
import { getDiscordStats } from "@/features/home/discord";
import { getHeroStats } from "@/features/home/hero-stats";
import { getWelcomeData } from "@/features/home/welcome";
import { getTopPlayers } from "@/features/players/top-players";

export async function HomeExperience() {
  const [viewer, topPlayers, heroStats, discordStats] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
    getHeroStats(),
    getDiscordStats(),
  ]);

  // Logged-in players get a "Welcome back" hero with their own numbers.
  const welcome = viewer ? await getWelcomeData(viewer) : null;

  return (
    <VisitorHome
      viewer={viewer}
      topPlayers={topPlayers}
      heroStats={heroStats}
      discordStats={discordStats}
      welcome={welcome}
    />
  );
}
