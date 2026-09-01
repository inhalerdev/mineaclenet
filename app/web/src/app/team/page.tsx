import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentViewer } from "@/features/auth/session";
import { getDashboard } from "@/features/social/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamPage() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect("/login");
  }

  const dashboard = await getDashboard(viewer);

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <main className="utility-page">
        <section className="utility-card">
          <small>TEAM HUB</small>
          <h1>{dashboard.viewerTeam || "No team"}</h1>
          <p>
            {dashboard.viewerTeam
              ? `${dashboard.viewerTeamRole || "Member"} on ${dashboard.viewerTeam}`
              : "Join or create a team in-game to connect your team here"}
          </p>
        </section>
      </main>
    </div>
  );
}
