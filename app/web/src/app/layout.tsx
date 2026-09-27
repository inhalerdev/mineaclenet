import type { ReactNode } from "react";
import "./tokens.css";
import "./globals.css";

export const metadata = {
  title: "Home | Mineacle",
  description: "Mineacle SMP — play, compete, vote, and connect with the community.",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Start downloading the site font right away, so pages never show
            a fallback font first (used in site/SiteFrame.module.css). */}
        <link
          rel="preload"
          href="/shared/fonts/mineacle-primary.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
