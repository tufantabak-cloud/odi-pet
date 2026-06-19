import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import SplashScreen from "@/components/ui/SplashScreen";
import PwaEnforcer from "@/components/ui/PwaEnforcer";
import PwaUpdater from "@/components/ui/PwaUpdater";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#6C5CE7',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Odi.Pet — Can Dostunun Yaşam Platformu',
  description: 'Can Dostunun Yaşam Platformu',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Odi.Pet',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} antialiased h-full`}>
      <body className="min-h-full flex flex-col font-sans text-[16px] bg-bg-main text-text-primary">
        <PwaEnforcer />
        <SplashScreen />
        <OfflineIndicator />
        <PwaUpdater />
        {children}
      </body>
    </html>
  );
}
