import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const title = "NEXUS OS";
// Files in public/ need the GitHub Pages path prefix added by hand.
const base = process.env.PAGES_BASE_PATH ?? "";
const description = "Your personal AI operating system. One intelligent workspace that understands your life, remembers your context, plans your work and executes tasks.";

export const metadata: Metadata = {
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  title,
  description,
  openGraph: { title, description, type: "website", siteName: title },
  twitter: { card: "summary_large_image", title, description },
  manifest: `${base}/manifest.webmanifest`,
  icons: { apple: `${base}/apple-touch-icon.png` },
  appleWebApp: { capable: true, title, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#06030f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
