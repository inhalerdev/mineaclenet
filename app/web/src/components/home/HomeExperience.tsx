import { Geist } from "next/font/google";
import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
});

export async function HomeExperience() {
  const viewer = await getCurrentViewer();

  return (
    <div className={geist.className}>
      <VisitorHome viewer={viewer} />
    </div>
  );
}
