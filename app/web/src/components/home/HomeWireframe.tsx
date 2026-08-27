import { SiteFooter } from "@/components/shell/SiteFooter";
import { wireframePlayers, wireframeServer, wireframeTeams } from "@/lib/home-wireframe-data";
import { AccountUtilitySection } from "./sections/AccountUtilitySection";
import { CompetitiveSection } from "./sections/CompetitiveSection";
import { HeroStage } from "./sections/HeroStage";
import { JoinSection } from "./sections/JoinSection";
import { OverviewSection } from "./sections/OverviewSection";
import { PlayerDiscoverySection } from "./sections/PlayerDiscoverySection";
import { ServerPulseSection } from "./sections/ServerPulseSection";
import { WorldActivitySection } from "./sections/WorldActivitySection";

export function HomeWireframe() {
  return (
    <>
      <main className="home-wireframe">
        <HeroStage server={wireframeServer} />
        <ServerPulseSection server={wireframeServer} />
        <OverviewSection />
        <PlayerDiscoverySection players={wireframePlayers} />
        <CompetitiveSection players={wireframePlayers} teams={wireframeTeams} />
        <AccountUtilitySection />
        <WorldActivitySection />
        <JoinSection />
      </main>
      <SiteFooter />
    </>
  );
}
