import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPage } from "@/components/auth/AccountPage";
import { safeReturnPath, withReturnPath } from "@/shared/navigation/return-path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Log in | Mineacle",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.next);

  // Old links used /login?mode=create for sign-up.
  if (params.mode === "create") {
    redirect(withReturnPath("/register", returnTo));
  }

  return <AccountPage mode="login" returnTo={returnTo} />;
}
