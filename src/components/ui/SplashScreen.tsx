"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { isTestOrPreviewEnvironment } from "@/lib/testing/is-test-or-preview";

const PHASE_ONE_DURATION_MS = 200;
const TOTAL_SPLASH_DURATION_MS = 400;
const FADE_OUT_DURATION_MS = 200;

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [phase, setPhase] = useState<1 | 2>(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const alreadySeen =
        sessionStorage.getItem("odi_splash_seen") === "true" ||
        localStorage.getItem("odi_splash_seen") === "true";

      const isTwaOrStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      const isTestEnv =
        isTestOrPreviewEnvironment() ||
        window.navigator.userAgent.includes("Playwright") ||
        window.location.search.includes("test=true") ||
        window.location.search.includes("nosplash=true");

      // In TWA / standalone, Android native splash is already shown; bypass immediately.
      if (alreadySeen || isTwaOrStandalone || isTestEnv) {
        try {
          localStorage.setItem("odi_splash_seen", "true");
          sessionStorage.setItem("odi_splash_seen", "true");
        } catch {}
        return;
      }
      setIsVisible(true);
    }

    // Fast, crisp transition for initial web browser load
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, PHASE_ONE_DURATION_MS);

    // Fade-out starts
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, TOTAL_SPLASH_DURATION_MS);

    // Remove from DOM completely
    const endTimer = setTimeout(() => {
      try {
        localStorage.setItem("odi_splash_seen", "true");
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
      className={`fixed inset-0 z-[99999] bg-[#3b0764] transition-opacity duration-500 ease-out ${
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
      {/* Logo içeriği — SVG artık transparan, tek renk yüzeyi CSS bg-[#3b0764] */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${
          phase === 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image
          src="/brand/logos/splash/odi-splash-logo.svg"
          alt="Odi.Pet — Kedi ve Köpek Sağlık & Yaşam Platformu"
          fill
          sizes="100vw"
          className="object-contain object-center"
          priority
        />
      </div>

      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${
          phase === 1 ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image
          src="/brand/logos/splash/odi-splash-logo.svg"
          alt="Odi — Logo"
          fill
          sizes="100vw"
          className="object-contain object-center"
          priority
        />
      </div>
    </div>
  );
}
