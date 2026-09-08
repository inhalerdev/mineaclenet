import { VisitorHome } from "@/components/home/VisitorHome";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentViewer } from "@/features/auth/session";

export async function HomeExperience() {
  const viewer = await getCurrentViewer();

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <VisitorHome viewer={viewer} />
    </div>
  );
}
