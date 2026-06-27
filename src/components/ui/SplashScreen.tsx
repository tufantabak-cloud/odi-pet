"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<1 | 2>(1);

  useEffect(() => {
    // E2E testlerde veya bu React oturumunda zaten oynatıldıysa tekrar gösterme
    const isPlayed = typeof window !== "undefined" && sessionStorage.getItem("odi_splash_played") === "true";
    if (
      isPlayed ||
      (typeof window !== "undefined" &&
        (window.navigator.userAgent.includes("Playwright") ||
          window.location.search.includes("test=true") ||
          ((window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1") &&
            window.location.pathname.startsWith("/admin"))))
    ) {
      setIsVisible(false);
      return;
    }

    // Bu oturumda artık oynatıldı olarak işaretle
    if (typeof window !== "undefined") {
      sessionStorage.setItem("odi_splash_played", "true");
    }

    // Faz 1 → Faz 2 geçişi: 800ms sonra
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, 800);

    // Toplam süre: 1.5 saniye (1500ms) sonra kapat
    const endTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(endTimer);
    };
  }, []);

  // Splash görünürken scroll kilitle
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.classList.add("odi-splash-active");
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.classList.remove("odi-splash-active");
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.classList.remove("odi-splash-active");
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black">
      {/* Faz 2 — splash2.jpg (altta başlar, faz 2'de tam görünür) */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
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
        className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
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
