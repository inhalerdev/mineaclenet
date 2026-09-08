import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";

export async function HomeExperience() {
  const viewer = await getCurrentViewer();

  return <VisitorHome viewer={viewer} />;
}
