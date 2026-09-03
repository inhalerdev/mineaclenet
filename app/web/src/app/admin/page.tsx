import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentViewer } from "@/features/auth/session";
import {
  ADMIN_GATE_COOKIE,
  ADMIN_PREVIEW_COOKIE,
  adminGateCookieOptions,
  adminPreviewCookieOptions,
  createAdminGateToken,
  verifyAdminGateCredentials,
  verifyAdminGateToken,
} from "@/features/admin-gate/gate";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Development Access | Mineacle",
  description: "Private Mineacle development gateway.",
};

type AdminPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function unlockGateway(formData: FormData) {
  "use server";

  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  try {
    const valid = await verifyAdminGateCredentials(username, password);

    if (!valid) {
      redirect("/admin?error=invalid");
    }

    const store = await cookies();

    store.set(
      ADMIN_GATE_COOKIE,
      createAdminGateToken(),
      adminGateCookieOptions(),
    );

    redirect("/admin");
  } catch (error) {
    // Next redirects are thrown internally and must be allowed through.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest || "").startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }

    console.error("[mineacle-admin-gate] Gateway login failed", error);
    redirect("/admin?error=config");
  }
}

async function requireUnlockedAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_GATE_COOKIE)?.value;

  if (!verifyAdminGateToken(token)) {
    redirect("/admin");
  }

  return store;
}

async function openVisitorHomepage() {
  "use server";

  const store = await requireUnlockedAdmin();

  store.set(
    ADMIN_PREVIEW_COOKIE,
    "visitor",
    adminPreviewCookieOptions(),
  );

  redirect("/");
}

async function openPlayerHomepage() {
  "use server";

  const store = await requireUnlockedAdmin();
  store.delete(ADMIN_PREVIEW_COOKIE);

  const viewer = await getCurrentViewer();

  redirect(viewer ? "/" : "/login");
}

async function lockGateway() {
  "use server";

  const store = await cookies();
  store.delete(ADMIN_GATE_COOKIE);
  store.delete(ADMIN_PREVIEW_COOKIE);

  redirect("/admin");
}

export default async function AdminPage({
  searchParams,
}: AdminPageProps) {
  const store = await cookies();
  const token = store.get(ADMIN_GATE_COOKIE)?.value;
  const unlocked = verifyAdminGateToken(token);
  const params = searchParams ? await searchParams : {};
  const error = params.error;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.brand}>
          <img
            src="/shared/images/branding/mineacle-logo.png"
            alt="Mineacle"
            draggable={false}
          />
        </header>

        {!unlocked ? (
          <>
            <div className={styles.heading}>
              <small>DEVELOPMENT GATEWAY</small>
              <h1>Private access</h1>
              <p>
                The public website is hidden while development is in
                progress. This login is separate from Minecraft player
                accounts.
              </p>
            </div>

            <form action={unlockGateway} className={styles.card}>
              <label>
                Username
                <input
                  autoComplete="username"
                  name="username"
                  required
                  type="text"
                />
              </label>

              <label>
                Password
                <input
                  autoComplete="current-password"
                  name="password"
                  required
                  type="password"
                />
              </label>

              {error === "invalid" ? (
                <div className={styles.error}>
                  Incorrect username or password
                </div>
              ) : null}

              {error === "config" ? (
                <div className={styles.error}>
                  Gateway configuration is incomplete
                </div>
              ) : null}

              <button type="submit">Unlock Mineacle</button>
            </form>

            <p className={styles.footer}>
              Administrator access only
            </p>
          </>
        ) : (
          <>
            <div className={styles.heading}>
              <div className={styles.status}>
                <span aria-hidden="true" />
                DEVELOPMENT ACCESS ACTIVE
              </div>
              <h1>Homepage preview</h1>
              <p>
                The development gateway is unlocked. Choose which homepage
                state you want to inspect.
              </p>
            </div>

            <div className={styles.previewGrid}>
              <form action={openVisitorHomepage}>
                <button className={styles.previewCard} type="submit">
                  <small>SIGNED OUT</small>
                  <strong>Visitor homepage</strong>
                  <span>
                    Force the public visitor experience, even if a player
                    session is currently active.
                  </span>
                  <b>Open visitor view →</b>
                </button>
              </form>

              <form action={openPlayerHomepage}>
                <button className={styles.previewCard} type="submit">
                  <small>VERIFIED PLAYER</small>
                  <strong>Player homepage</strong>
                  <span>
                    Open the authenticated player experience. If no player
                    session exists, Mineacle will open the normal player
                    login first.
                  </span>
                  <b>Open player view →</b>
                </button>
              </form>
            </div>

            <form action={lockGateway} className={styles.lockForm}>
              <button type="submit">Lock development gateway</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
