import type { Metadata } from "next";
import { AccountPage } from "@/components/auth/AccountPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create account | Mineacle",
};

export default function RegisterPage() {
  return <AccountPage mode="create" />;
}
