"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const PHASE_TWO_START_DELAY_MS = 800;
const SPLASH_END_DELAY_MS = 5000;

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
    }, PHASE_TWO_START_DELAY_MS);

    // Splash 2'yi slogan rahatça okunabilsin diye yaklaşık 4,2 saniye göster.
    const endTimer = setTimeout(() => {
      setIsVisible(false);
    }, SPLASH_END_DELAY_MS);

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

  const dismissSplash = () => {
    if (phase === 2) {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#3E1EA3] ${
        phase === 2 ? "cursor-pointer" : ""
      }`}
      role={phase === 2 ? "button" : undefined}
      tabIndex={phase === 2 ? 0 : -1}
      aria-label={phase === 2 ? "Açılış ekranını geç" : undefined}
      onClick={dismissSplash}
      onKeyDown={(event) => {
        if (phase === 2 && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          dismissSplash();
        }
      }}
    >
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
