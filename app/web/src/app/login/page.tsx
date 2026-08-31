import { redirect } from "next/navigation";
import { AuthClient } from "@/components/auth/AuthClient";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentViewer } from "@/features/auth/session";

export default async function LoginPage() {
  const viewer = await getCurrentViewer();

  if (viewer) {
    redirect("/");
  }

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={null} />
      <main className="auth-page">
        <section className="auth-art">
          <video autoPlay loop muted playsInline>
            <source
              src="https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/hero-bg.mp4"
              type="video/mp4"
            />
          </video>
          <span />
          <div>
            <small>MINEACLE ACCOUNT</small>
            <strong>Your server identity, on the web.</strong>
            <p>
              Verify once in Minecraft. Then follow players, compare stats,
              track teams and keep up with Mineacle.
            </p>
          </div>
        </section>

        <section className="auth-panel">
          <AuthClient />
        </section>
      </main>
    </div>
  );
}
