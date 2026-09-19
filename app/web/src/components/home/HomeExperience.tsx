import { Rubik } from "next/font/google";
import { VisitorHome } from "@/components/home/VisitorHome";
import { getCurrentViewer } from "@/features/auth/session";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
});

export async function HomeExperience() {
  const viewer = await getCurrentViewer();

  return (
    <div className={rubik.className}>
      <VisitorHome viewer={viewer} />
    </div>
  );
}
