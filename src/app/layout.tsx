import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import 'leaflet/dist/leaflet.css';
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import SplashScreen from "@/components/ui/SplashScreen";
import PwaEnforcer from "@/components/ui/PwaEnforcer";
import PwaUpdater from "@/components/ui/PwaUpdater";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#000000',
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
    <html lang="tr" className={`${plusJakarta.variable} antialiased h-full`}>
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
