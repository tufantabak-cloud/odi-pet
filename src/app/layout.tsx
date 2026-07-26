import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "./globals.css";
import 'leaflet/dist/leaflet.css';
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import SplashScreen from "@/components/ui/SplashScreen";
import PwaEnforcer from "@/components/ui/PwaEnforcer";
import PwaUpdater from "@/components/ui/PwaUpdater";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#3E1EA3',
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
    <html lang="tr" className="antialiased h-full">
      <head>
        {/* The versioned stylesheet is self-hosted in public/vendor. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link
          rel="stylesheet"
          href="/vendor/tabler-icons/tabler-icons.min.css"
        />
      </head>
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
