import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Odi Pet Care",
  description: "Pet bakım ve klinik takip sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} antialiased h-full`}>
      <body className="min-h-full flex flex-col font-sans text-[16px] bg-bg-main text-text-primary">
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
