import type { ReactNode } from "react";
import "./globals.css";
import "./home.css";
import "./systems.css";
import "./predesign.css";
import "./punishments.css";

export const metadata = {
  title: "Home | Mineacle",
  description: "Mineacle SMP — play, compete, vote, and connect with the community.",
};
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#111111" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
