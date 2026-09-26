import { redirect } from "next/navigation";
import { AccountSettingsPage } from "@/components/account/AccountSettingsPage";
import {
  getActiveSessionCount,
  getCurrentViewer,
} from "@/features/auth/session";
import { getPlayerByUuid } from "@/features/players/repository";
import { getTopPlayers } from "@/features/players/top-players";
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

  const [topPlayers, player, sessionCount] = await Promise.all([
    getTopPlayers(),
    getPlayerByUuid(viewer.uuid),
    getActiveSessionCount(viewer.accountId),
  ]);

  return (
    <AccountSettingsPage
      viewer={viewer}
      topPlayers={topPlayers}
      player={player}
      sessionCount={sessionCount}
    />
  );
}
