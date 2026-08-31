import { AppSidebar } from "@/components/shell/AppSidebar";
import { PlayerHome } from "@/components/home/PlayerHome";
import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";
import { getDashboard } from "@/features/social/dashboard";

export async function HomeExperience() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return (
      <div className="mineacle-app">
        <AppSidebar viewer={null} />
        <VisitorHome />
      </div>
    );
  }

  const dashboard = await getDashboard(viewer);

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <PlayerHome viewer={viewer} dashboard={dashboard} />
    </div>
  );
}
