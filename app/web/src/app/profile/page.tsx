import { redirect } from "next/navigation";
import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";
import {
  getActiveSessionCount,
  getCurrentViewer,
} from "@/features/auth/session";
import { getPlayerByUuid } from "@/features/players/repository";
import { getTopPlayers } from "@/features/players/top-players";
import { getSocialLinksForAccount } from "@/features/social/social-links";
import { withReturnPath } from "@/shared/navigation/return-path";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your account | Mineacle",
};

export default async function Profile() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect(withReturnPath("/login", "/profile"));
  }

  const [topPlayers, player, sessionCount, socialLinks] = await Promise.all([
    getTopPlayers(),
    getPlayerByUuid(viewer.uuid),
    getActiveSessionCount(viewer.accountId),
    getSocialLinksForAccount(viewer.accountId).catch(() => []),
  ]);

  return (
    <AccountSettingsPage
      viewer={viewer}
      topPlayers={topPlayers}
      player={player}
      sessionCount={sessionCount}
      socialLinks={socialLinks}
    />
  );
}
