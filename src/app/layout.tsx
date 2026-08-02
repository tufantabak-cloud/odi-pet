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
  metadataBase: new URL('https://odi.pet'),
  title: 'Odi.Pet — Can Dostunun Yaşam Platformu',
  description: 'Can Dostunun Yaşam Platformu',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Odi.Pet',
  },
  icons: {
    icon: [
      { url: '/brand/favicon/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/favicon/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/brand/favicon/FAVICON.ico',
    apple: '/brand/app-icons/odi-icon-180.png',
  },
  openGraph: {
    title: 'Odi.Pet — Can Dostunun Yaşam Platformu',
    description: 'Can Dostunun Yaşam Platformu',
    siteName: 'Odi.Pet',
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: '/generated/odi-og-image-1200x630.jpg',
        width: 1200,
        height: 630,
        alt: 'Odi.Pet — Can Dostunun Yaşam Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Odi.Pet — Can Dostunun Yaşam Platformu',
    description: 'Can Dostunun Yaşam Platformu',
    images: ['/generated/odi-og-image-1200x630.jpg'],
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
