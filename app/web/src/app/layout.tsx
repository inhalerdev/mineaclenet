import { AppHeader } from "@/components/shell/AppHeader";
import "./globals.css";

export const metadata = {
  title: "Mineacle",
  description: "Mineacle web application",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

type RootLayoutProps = {
  children: any;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
