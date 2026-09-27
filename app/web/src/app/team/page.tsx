import { redirect } from "next/navigation";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro } from "@/components/site/PageIntro";
import { getCurrentViewer } from "@/features/auth/session";
import { getPlayerByUuid } from "@/features/players/repository";
import { getTopPlayers } from "@/features/players/top-players";
import { withReturnPath } from "@/shared/navigation/return-path";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team | Mineacle",
};

/* Team (/team): your in-game team, if you have one. */
export default async function Team() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect(withReturnPath("/login", "/team"));
  }

  const [topPlayers, player] = await Promise.all([
    getTopPlayers(),
    getPlayerByUuid(viewer.uuid).catch(() => null),
  ]);
  const team = player?.teamName || "";

  return (
    <FramedPage viewer={viewer} topPlayers={topPlayers} currentPath="/team" variant="content">
      <div className={content.content}>
        <PageIntro tag="Team" title={team || "No team yet"}>
          {team
            ? `You're ${player?.teamRole ? `a ${player.teamRole}` : "a member"} of ${team}.`
            : "Join or create a team in-game and it will show up here."}
        </PageIntro>
      </div>
    </FramedPage>
  );
}
