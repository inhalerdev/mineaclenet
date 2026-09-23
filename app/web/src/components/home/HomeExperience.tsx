import { Rubik } from "next/font/google";
import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";
import { getPlayerLeaderboard } from "@/features/players/repository";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
});

export async function HomeExperience() {
  const [viewer, leaderboard] = await Promise.all([
    getCurrentViewer(),
    getPlayerLeaderboard("balance", 3).catch(() => []),
  ]);

  const topPlayers = leaderboard.map((player) => ({
    uuid: player.uuid,
    username: player.username,
    displayName: player.displayName,
    online: player.online,
  }));

  return (
    <div className={rubik.className}>
      <VisitorHome viewer={viewer} topPlayers={topPlayers} />
    </div>
  );
}
