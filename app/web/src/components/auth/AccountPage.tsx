import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthClient, type AuthMode } from "@/components/auth/AuthClient";
import { FramedPage } from "@/components/site/FramedPage";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import { getCurrentViewer } from "@/features/auth/session";
import { getTopPlayers } from "@/features/players/top-players";

/*
 * Log in (/login) and create account + in-game verify (/register).
 * The account panel sits in the middle of the shared inner-page layout
 * (site/FramedPage.tsx).
 */
export async function AccountPage({ mode }: { mode: AuthMode }) {
  const [viewer, topPlayers] = await Promise.all([
    getCurrentViewer(),
    getTopPlayers(),
  ]);

  if (viewer) {
    redirect("/");
  }

  return (
    <AccountShell mode={mode} topPlayers={topPlayers}>
      <AuthClient initialMode={mode} />
    </AccountShell>
  );
}

/* The page layout around the account panel. */
export function AccountShell({
  mode,
  topPlayers,
  children,
}: {
  mode: AuthMode;
  topPlayers: HomeLeaderboardPlayer[];
  children: ReactNode;
}) {
  return (
    <FramedPage
      topPlayers={topPlayers}
      currentPath={mode === "create" ? "/register" : "/login"}
    >
      {children}
    </FramedPage>
  );
}
