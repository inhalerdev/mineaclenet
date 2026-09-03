import { redirect } from "next/navigation";
import { AuthClient } from "@/components/auth/AuthClient";
import { getCurrentViewer } from "@/features/auth/session";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Private Access | Mineacle",
  description: "Sign in with a verified Mineacle account.",
};

export default async function LoginPage() {
  const viewer = await getCurrentViewer();

  if (viewer) {
    redirect("/");
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.brand}>
          <img
            src="/shared/images/branding/mineacle-logo.png"
            alt="Mineacle"
            draggable={false}
          />
        </div>

        <header className={styles.intro}>
          <div className={styles.accessLabel}>
            <span aria-hidden="true" />
            PRIVATE ACCESS
          </div>
          <h1>Mineacle is currently restricted</h1>
          <p>
            Sign in with your verified Minecraft account to continue. New
            users can verify their Mineacle player in-game before creating a
            password.
          </p>
        </header>

        <section className={styles.loginPanel} aria-label="Mineacle sign in">
          <AuthClient />
        </section>

        <p className={styles.notice}>
          Admins and verified Mineacle players only
        </p>
      </section>
    </main>
  );
}
