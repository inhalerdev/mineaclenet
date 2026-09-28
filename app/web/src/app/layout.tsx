import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./tokens.css";
import "./globals.css";

/* The site's public address, so link previews get full image URLs. Read on
   the server (SITE_URL in the service's env file); defaults to
   https://mineacle.net. */
const SITE_URL = process.env.SITE_URL?.trim() || "https://mineacle.net";

/*
 * Defaults for every page. Link previews (Discord, X, iMessage...) show the
 * page title, the description and the preview image below; each page sets
 * its own title. The image is public/shared/images/og/mineacle-og.png
 * (1200 x 630).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Mineacle | Fight. Trade. Rise.",
  description:
    "A Minecraft Java survival server with PvP, a player-run economy and friends to build with. Join at mineacle.net.",
  openGraph: {
    type: "website",
    siteName: "Mineacle",
    locale: "en_US",
    images: [
      {
        url: "/shared/images/og/mineacle-og.png",
        width: 1200,
        height: 630,
        alt: "Mineacle: Fight. Trade. Rise. Play at mineacle.net",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/shared/images/og/mineacle-og.png"],
  },
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
