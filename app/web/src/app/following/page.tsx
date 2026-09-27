import { redirect } from "next/navigation";
import { FollowingPage } from "@/components/social/FollowingPage";
import { getCurrentViewer } from "@/features/auth/session";
import { getTopPlayers } from "@/features/players/top-players";
import {
  getFollowingPlayers,
  type FollowingPlayer,
} from "@/features/social/follows";
import { withReturnPath } from "@/shared/navigation/return-path";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Following | Mineacle",
};

async function loadFollowing(accountId: number): Promise<FollowingPlayer[] | null> {
  try {
    return await getFollowingPlayers(accountId);
  } catch (error) {
    console.error("[mineacle-social] Failed to load following", error);
    return null;
  }
}

export default async function Following() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect(withReturnPath("/login", "/following"));
  }

  const [topPlayers, following] = await Promise.all([
    getTopPlayers(),
    loadFollowing(viewer.accountId),
  ]);

  return <FollowingPage viewer={viewer} topPlayers={topPlayers} following={following} />;
}
