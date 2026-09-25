import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPage } from "@/components/auth/AccountPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Log in | Mineacle",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  // Old links used /login?mode=create for sign-up.
  if ((await searchParams).mode === "create") {
    redirect("/register");
  }

  return <AccountPage mode="login" />;
}
