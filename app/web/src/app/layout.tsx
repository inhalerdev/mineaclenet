import type { ReactNode } from "react";
import "./tokens.css";
import "./globals.css";
import "./home.css";
import "./systems.css";
import "./flat-navigation.css";
import "./module-system.css";

const navigationDrawerBootstrap = `
  try {
    document.documentElement.dataset.navigationCollapsed =
      window.localStorage.getItem("mineacle:navigation-collapsed") === "true"
        ? "true"
        : "false";
  } catch {
    document.documentElement.dataset.navigationCollapsed = "false";
  }
`;

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
        <script
          id="mineacle-navigation-state"
          dangerouslySetInnerHTML={{
            __html: navigationDrawerBootstrap,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
