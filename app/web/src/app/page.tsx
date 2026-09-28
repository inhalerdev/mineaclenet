import type { Metadata } from "next";
import { HomeExperience } from "@/components/home/HomeExperience";

export const metadata: Metadata = {
  title: "Mineacle | Fight. Trade. Rise.",
  description:
    "A Minecraft Java survival server with PvP, a player-run economy and friends to build with. Join at mineacle.net.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <HomeExperience />;
}
