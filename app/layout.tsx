import type { ReactNode } from "react";
import { Rubik } from "next/font/google";
import "./globals.css";
import "./home.css";
import "./systems.css";
import "./predesign.css";
import "./punishments.css";
import "./navigation.css";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "Home | Mineacle",
  description:
    "Mineacle SMP — play, compete, vote, and connect with the community.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={rubik.className}>{children}</body>
    </html>
  );
}
