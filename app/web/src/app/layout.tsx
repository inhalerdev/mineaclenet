import type { ReactNode } from "react";
import "./globals.css";
import "./home.css";
import "./systems.css";
import "./punishments.css";
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
