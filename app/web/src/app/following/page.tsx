import { redirect } from "next/navigation";
import { FollowingPage, type FriendsTab } from "@/components/social/FollowingPage";
import { getCurrentViewer } from "@/features/auth/session";
import { getTopPlayers } from "@/features/players/top-players";
import {
  getFollowers,
  getFollowingPlayers,
  type FollowingPlayer,
} from "@/features/social/follows";
import { withReturnPath } from "@/shared/navigation/return-path";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Friends | Mineacle",
};

async function safely(load: () => Promise<FollowingPlayer[]>) {
  try {
    return await load();
  } catch (error) {
    console.error("[mineacle-social] Failed to load friends", error);
    return null;
  }
}

/* Friends (/following): who you follow, and ?tab=followers for who follows
   you. Both lists are loaded so the tab counts are right. */
export default async function Following({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect(withReturnPath("/login", "/following"));
  }

  const tab: FriendsTab = (await searchParams).tab === "followers" ? "followers" : "following";
  const [topPlayers, following, followers] = await Promise.all([
    getTopPlayers(),
    safely(() => getFollowingPlayers(viewer.accountId)),
    safely(() => getFollowers(viewer.uuid)),
  ]);

  return (
    <FollowingPage
      viewer={viewer}
      topPlayers={topPlayers}
      tab={tab}
      following={following}
      followers={followers}
    />
  );
}
