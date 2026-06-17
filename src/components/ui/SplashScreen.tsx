"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Bu değişken React bileşeninin dışında olduğu için, Next.js uygulaması
// sekme açık kaldığı sürece (örneğin login sonrası router.refresh yapıldığında)
// hafızada kalır ve true değerini korur. 
// Uygulama tamamen kapatılıp açıldığında (veya F5 atıldığında) tekrar false olur.
let hasPlayedThisSession = false;

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<1 | 2>(1);

  useEffect(() => {
    // E2E testlerde veya bu React oturumunda zaten oynatıldıysa tekrar gösterme
    if (
      hasPlayedThisSession ||
      (typeof window !== "undefined" &&
        (window.navigator.userAgent.includes("Playwright") ||
          window.location.search.includes("test=true")))
    ) {
      setIsVisible(false);
      return;
    }

    // Bu oturumda artık oynatıldı olarak işaretle
    hasPlayedThisSession = true;

    // Faz 1 → Faz 2 geçişi: 2 saniye sonra
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, 2000);

    // Toplam süre: 5 saniye sonra kapat
    const endTimer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

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
