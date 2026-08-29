import type { ReactNode } from "react";
import "./globals.css";
import "./homepage-polish.css";

export const metadata = {
  title: "Home | Mineacle",
  description: "Mineacle SMP — play, compete, vote, and connect with the community.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
