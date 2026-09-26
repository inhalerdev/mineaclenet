import type { Metadata } from "next";
import { AccountPage } from "@/components/auth/AccountPage";
import { safeReturnPath } from "@/shared/navigation/return-path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create account | Mineacle",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const returnTo = safeReturnPath((await searchParams).next);

  return <AccountPage mode="create" returnTo={returnTo} />;
}
