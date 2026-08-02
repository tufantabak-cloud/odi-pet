"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const PHASE_ONE_DURATION_MS = 1000;
const TOTAL_SPLASH_DURATION_MS = 3000;
const FADE_OUT_DURATION_MS = 500;

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [phase, setPhase] = useState<1 | 2>(1);

  useEffect(() => {
    // E2E test veya otomatik test ortamı denetimi
    const isTestEnv =
      typeof window !== "undefined" &&
      (window.navigator.userAgent.includes("Playwright") ||
        window.location.search.includes("test=true") ||
        ((window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1") &&
          window.location.pathname.startsWith("/admin")));

    if (isTestEnv) {
      setIsVisible(false);
      return;
    }

    // Faz 1 -> Faz 2 geçişi (1000ms)
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, PHASE_ONE_DURATION_MS);

    // Fade-out başlatma (3000ms)
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, TOTAL_SPLASH_DURATION_MS);

    // Ekrandan tamamen kaldırma (3500ms)
    const endTimer = setTimeout(() => {
      setIsVisible(false);
    }, TOTAL_SPLASH_DURATION_MS + FADE_OUT_DURATION_MS);

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, []);

  // Scroll kilitleme
  useEffect(() => {
    if (isVisible && !isFadingOut) {
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
  }, [isVisible, isFadingOut]);

  const dismissSplash = () => {
    if (phase === 2 && !isFadingOut) {
      setIsFadingOut(true);
      setTimeout(() => setIsVisible(false), FADE_OUT_DURATION_MS);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#3E1EA3] transition-opacity duration-500 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      } ${phase === 2 ? "cursor-pointer" : ""}`}
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
      {/* Faz 2 — Resmi OPOS Slogan / Ana Logo Varlığı */}
      <div
        className={`absolute inset-0 flex items-center justify-center p-8 transition-opacity duration-500 ease-in-out ${
          phase === 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80">
          <Image
            src="/brand/logos/primary/odi-logo-primary.png"
            alt="Odi.Pet — Can Dostunun Yaşam Platformu"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      </div>

      {/* Faz 1 — Resmi OPOS Açılış Logosu Varlığı */}
      <div
        className={`absolute inset-0 flex items-center justify-center p-8 transition-opacity duration-500 ease-in-out ${
          phase === 1 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80">
          <Image
            src="/brand/logos/splash/odi-splash-logo.png"
            alt="Odi.Pet — Logo"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      </div>
    </div>
  );
}
