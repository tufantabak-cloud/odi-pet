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
  themeColor: '#3b0764',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://odi.pet'),
  title: 'Odi.Pet — Kedi ve Köpek Sağlık & Yaşam Platformu',
  description: 'Kedi ve köpekleriniz için dijital aşı takvimi, parazit takibi, kilo ve beslenme yönetimi ile yapay zeka destekli sağlık asistanı. Can dostunuzun tüm bakım ve sağlık takibi tek platformda.',
  keywords: [
    'kedi aşı takvimi',
    'köpek aşı takvimi',
    'kedi sağlık karnesi',
    'köpek sağlık takibi',
    'kedi beslenme planı',
    'kedi parazit takibi',
    'köpek parazit takibi',
    'veteriner asistanı',
    'odi pet',
    'evcil hayvan uygulaması',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Odi.Pet',
  },
  icons: {
    icon: [
      { url: '/brand/app-icons/odi-icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/app-icons/odi-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/app-icons/odi-icon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/brand/app-icons/odi-icon-48.png',
    apple: '/brand/app-icons/odi-icon-180.png',
  },
  openGraph: {
    title: 'Odi.Pet — Kedi ve Köpek Sağlık & Yaşam Platformu',
    description: 'Kedi ve köpekleriniz için dijital aşı takvimi, parazit takibi, kilo ve beslenme yönetimi ile yapay zeka destekli sağlık asistanı. Can dostunuzun tüm bakım ve sağlık takibi tek platformda.',
    siteName: 'Odi.Pet',
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: '/generated/odi-og-image-1200x630.jpg',
        width: 1200,
        height: 630,
        alt: 'Odi.Pet — Kedi ve Köpek Sağlık & Yaşam Platformu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Odi.Pet — Kedi ve Köpek Sağlık & Yaşam Platformu',
    description: 'Kedi ve köpekleriniz için dijital aşı takvimi, parazit takibi, kilo ve beslenme yönetimi ile yapay zeka destekli sağlık asistanı. Can dostunuzun tüm bakım ve sağlık takibi tek platformda.',
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
      <head />
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
