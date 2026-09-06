import { cookies } from "next/headers";
import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";
import { ADMIN_PREVIEW_COOKIE } from "@/features/admin-gate/gate";

export async function HomeExperience() {
  const store = await cookies();
  const preview = store.get(ADMIN_PREVIEW_COOKIE)?.value;
  const viewer = await getCurrentViewer();

  if (preview === "visitor") {
    return <VisitorHome viewer={null} />;
  }

  return <VisitorHome viewer={viewer} />;
}
