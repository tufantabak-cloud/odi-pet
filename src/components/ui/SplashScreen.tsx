"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<1 | 2>(1);

  // Splash ekranı sıfırlama ve başlatma fonksiyonu
  const runSplashAnimation = () => {
    setIsVisible(true);
    setPhase(1);

    // 2 saniye sonra 2. aşamaya geç (splash1 -> splash2 crossfade)
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, 2000);

    // 2. aşamada 800ms fade-in/fade-out olduktan sonra, toplamda örn. 3 saniye daha gösterip kapat
    // (Kullanıcı 800ms geçişin ardından 2. resmi daha uzun süre görecek)
    const endTimer = setTimeout(() => {
      setIsVisible(false);
    }, 5000); // 2000 (aşama 1) + 800 (geçiş) + 2200 (bekleme) = 5000ms

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(endTimer);
    };
  };

  useEffect(() => {
    if (isVisible) {
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
  }, [isVisible]);

  useEffect(() => {
    // Disable in E2E testing
    if (typeof window !== 'undefined' && (window.navigator.userAgent.includes('Playwright') || window.location.search.includes('test=true'))) {
      setIsVisible(false);
      return;
    }

    // Her oturumda (session) splash ekranını sadece bir kez göster
    if (typeof window !== 'undefined') {
      const splashShown = sessionStorage.getItem("odi_splash_shown");
      if (splashShown) {
        setIsVisible(false);
        return;
      }
      sessionStorage.setItem("odi_splash_shown", "true");
    }

    // İlk açılışta animasyonu çalıştır
    const cleanup = runSplashAnimation();

    return () => {
      cleanup();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black">
      {/* 2. Görsel (Altta kalacak veya opacity transition ile üstte çıkacak) */}
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

      {/* 1. Görsel (Üstte, phase 2'de kaybolacak) */}
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
