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
      const isTestEnv =
        window.navigator.userAgent.includes("Playwright") ||
        window.location.search.includes("test=true") ||
        window.location.search.includes("nosplash=true");

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
    if (!isFadingOut) {
      setIsFadingOut(true);
      setTimeout(() => setIsVisible(false), FADE_OUT_DURATION_MS);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#480376] transition-opacity duration-500 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      } cursor-pointer`}
      role="button"
      tabIndex={0}
      aria-label="Açılış ekranını geç"
      onClick={dismissSplash}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
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
            alt="Odi — Can Dostunun Yaşam Platformu"
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
            alt="Odi — Logo"
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
