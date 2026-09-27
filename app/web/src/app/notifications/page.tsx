import { redirect } from "next/navigation";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { getCurrentViewer } from "@/features/auth/session";
import {
  getNotifications,
  type AccountNotification,
} from "@/features/notifications/repository";
import { getTopPlayers } from "@/features/players/top-players";
import { withReturnPath } from "@/shared/navigation/return-path";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications | Mineacle",
};

async function loadNotifications(
  accountId: number,
): Promise<AccountNotification[] | null> {
  try {
    return await getNotifications(accountId);
  } catch (error) {
    console.error("[mineacle-notifications] Failed to load", error);
    return null;
  }
}

export default async function Notifications() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect(withReturnPath("/login", "/notifications"));
  }

  const [topPlayers, notifications] = await Promise.all([
    getTopPlayers(),
    loadNotifications(viewer.accountId),
  ]);

  return (
    <NotificationsPage
      viewer={viewer}
      topPlayers={topPlayers}
      notifications={notifications}
    />
  );
}
