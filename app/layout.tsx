import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "NorthCo Dashboard", description: "Your calls, leads and follow-up in one place.", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#060607" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
