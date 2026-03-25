import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Pool Controller",
  description: "Cloud interface for Pentair pool controller",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pool Controller",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="max-w-lg mx-auto pb-24 min-h-screen">{children}</main>
        <Navigation />
      </body>
    </html>
  );
}
