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
    if (typeof window !== "undefined") {
      const alreadySeen = sessionStorage.getItem("odi_splash_seen") === "true";
      const isDevOrLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const isTestEnv =
        window.navigator.userAgent.includes("Playwright") ||
        window.location.search.includes("test=true") ||
        isDevOrLocal;

      if (alreadySeen || isTestEnv) {
        setIsVisible(false);
        return;
      }
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
      try {
        sessionStorage.setItem("odi_splash_seen", "true");
      } catch {}
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
    try {
      sessionStorage.setItem("odi_splash_seen", "true");
    } catch {}
    if (phase === 2 && !isFadingOut) {
      setIsFadingOut(true);
      setTimeout(() => setIsVisible(false), FADE_OUT_DURATION_MS);
    } else {
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#3B0764] transition-opacity duration-500 ease-out ${
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
      {/* Faz 2 — Kusursuz Ortalı & Taşmasız OPOS Splash Görseli (PNG) */}
      <div
        className={`absolute inset-0 flex items-center justify-center p-6 sm:p-12 transition-opacity duration-500 ease-in-out ${
          phase === 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="relative w-full h-full max-w-[85vw] max-h-[75vh] sm:max-w-[70vw] sm:max-h-[80vh]">
          <Image
            src="/brand/logos/splash/odi-splash-logo.png"
            alt="Odi.Pet — Can Dostunun Yaşam Platformu"
            fill
            sizes="(max-width: 768px) 85vw, 70vw"
            className="object-contain object-center"
            priority
          />
        </div>
      </div>

      {/* Faz 1 — Kusursuz Ortalı & Taşmasız OPOS Vektörel Splash Görseli (SVG) */}
      <div
        className={`absolute inset-0 flex items-center justify-center p-6 sm:p-12 transition-opacity duration-500 ease-in-out ${
          phase === 1 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="relative w-full h-full max-w-[85vw] max-h-[75vh] sm:max-w-[70vw] sm:max-h-[80vh]">
          <Image
            src="/brand/logos/splash/odi-splash-logo.svg"
            alt="Odi.Pet — Logo"
            fill
            sizes="(max-width: 768px) 85vw, 70vw"
            className="object-contain object-center"
            priority
          />
        </div>
      </div>
    </div>
  );
}
