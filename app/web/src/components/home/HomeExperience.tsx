import { cookies } from "next/headers";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { PlayerHome } from "@/components/home/PlayerHome";
import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";
import { ADMIN_PREVIEW_COOKIE } from "@/features/admin-gate/gate";
import { getDashboard } from "@/features/social/dashboard";

export async function HomeExperience() {
  const store = await cookies();
  const preview = store.get(ADMIN_PREVIEW_COOKIE)?.value;
  const viewer = await getCurrentViewer();

  // Development-only preview state. The separate admin gateway controls who
  // can reach the site and set this cookie.
  if (preview === "visitor") {
    return <VisitorHome />;
  }

  if (!viewer) {
    return <VisitorHome />;
  }

  const dashboard = await getDashboard(viewer);

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <PlayerHome viewer={viewer} dashboard={dashboard} />
    </div>
  );
}
