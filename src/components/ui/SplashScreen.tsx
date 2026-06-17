"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SPLASH_COOLDOWN_MS = 10 * 60 * 1000; // 10 dakika — web için splash tekrar süresi
const SPLASH_KEY = "odi_splash_last_shown";

function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;

  // E2E test ortamında splash gösterme
  if (
    window.navigator.userAgent.includes("Playwright") ||
    window.location.search.includes("test=true")
  ) {
    return false;
  }

  // PWA standalone modunda (ana ekrandan açılış): her seferinde göster
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone detection
    ("standalone" in window.navigator && (window.navigator as any).standalone === true);

  if (isStandalone) {
    // PWA'da son gösterimden bu yana yeterli süre geçmişse göster
    const lastShown = localStorage.getItem(SPLASH_KEY);
    if (!lastShown) return true;
    return Date.now() - parseInt(lastShown, 10) > SPLASH_COOLDOWN_MS;
  }

  // Normal tarayıcı: session başına bir kez
  const sessionKey = sessionStorage.getItem("odi_splash_shown");
  return !sessionKey;
}

function markSplashShown() {
  if (typeof window === "undefined") return;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as any).standalone === true);

  if (isStandalone) {
    localStorage.setItem(SPLASH_KEY, String(Date.now()));
  } else {
    sessionStorage.setItem("odi_splash_shown", "true");
  }
}

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true); // Başlangıçta görünür — hydration öncesi boşluk önlenir
  const [phase, setPhase] = useState<1 | 2>(1);
  const [ready, setReady] = useState(false); // Gerçekten gösterilmeli mi?

  useEffect(() => {
    const show = shouldShowSplash();
    setReady(show);
    if (!show) {
      setIsVisible(false);
      return;
    }

    markSplashShown();

    // Faz 1 → Faz 2 geçişi: 2 saniye sonra
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, 2000);

    // Toplam süre: 5 saniye
    const endTimer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(endTimer);
    };
  }, []);

  // Scroll kilidini splash görünürlüğüne göre ayarla
  useEffect(() => {
    if (isVisible && ready) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isVisible, ready]);

  if (!isVisible || !ready) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black">
      {/* Faz 2 — splash2.jpg (altta başlar, faz 2'de tam görünür) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          phase === 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image
          src="/assets/splash2.jpg"
          alt="Splash 2"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </div>

      {/* Faz 1 — splash1.jpg (üstte başlar, faz 2'de kaybolur) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          phase === 1 ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image
          src="/assets/splash1.jpg"
          alt="Splash 1"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
      </div>
    </div>
  );
}
