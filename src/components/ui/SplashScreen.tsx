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

    // 2. aşamada 800ms fade-in/fade-out olduktan sonra, toplamda örn. 2 saniye daha gösterip kapat
    // (Kullanıcı 800ms geçişin ardından 2. resmi bir süre görecek)
    const endTimer = setTimeout(() => {
      setIsVisible(false);
    }, 4000); // 2000 (aşama 1) + 800 (geçiş) + 1200 (bekleme) = 4000ms

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(endTimer);
    };
  };

  useEffect(() => {
    // İlk açılışta animasyonu çalıştır
    const cleanup = runSplashAnimation();

    // Uygulama arka plandan ön plana geldiğinde tekrar çalıştır
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runSplashAnimation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
