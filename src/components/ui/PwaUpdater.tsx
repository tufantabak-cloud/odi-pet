"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export default function PwaUpdater() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // 1. Yeni service worker kontrolü aldığında (skipWaiting tetiklendiğinde)
    const handleControllerChange = () => {
      setShowUpdate(true);
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // 2. Uygulama arka plandan öne geldiğinde periyodik güncelleme kontrolü
    const checkUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          // Listen for new service worker installation directly on the registration
          reg.addEventListener('updatefound', () => {
            setShowUpdate(true);
          });
          await reg.update();
        }
      } catch (error) {
        console.error("SW Update check failed", error);
      }
    };

    // İlk yüklemede de kontrol et
    checkUpdate();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkUpdate();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkUpdate);
    };
  }, []);

  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 1. Tarayıcı önbelleklerini (SW caches) tamamen temizle
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // 2. Bekleyen Service Worker varsa aktif et (Zaten skipWaiting: true olduğu için bu adıma genelde gerek kalmaz)
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 3. Mevcut sayfayı cache kullanmadan (Hard Reload) zorla yenile
      // Query string ile tarayıcı seviyesi cache buster
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('updated', Date.now().toString());
      window.location.href = currentUrl.toString();
      
    } catch (e) {
      console.error("Cache temizleme hatası:", e);
      window.location.reload();
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-96 z-[999999] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl shadow-2xl p-5 pr-12 relative overflow-hidden border border-white/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <RefreshCw className={`w-6 h-6 text-white ${isRefreshing ? 'animate-spin' : 'animate-[spin_3s_linear_infinite]'}`} />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-white font-black text-base">Yeni Sürüm Hazır! 🚀</h3>
            <p className="text-indigo-100 text-[13px] mt-1 mb-4 leading-relaxed font-medium">
              Odi.Pet için iyileştirmeler yüklendi. Hatalardan kurtulmak ve yeni özellikleri görmek için yenileyin.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleHardRefresh}
                disabled={isRefreshing}
                className="bg-white text-indigo-600 hover:bg-indigo-50 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-colors shadow-sm active:scale-95 disabled:opacity-70 disabled:active:scale-100"
              >
                {isRefreshing ? 'Yenileniyor...' : 'Hemen Yenile'}
              </button>
              <button
                onClick={() => setShowUpdate(false)}
                disabled={isRefreshing}
                className="bg-black/20 text-white hover:bg-black/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-95 disabled:opacity-70"
              >
                Sonra
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowUpdate(false)}
          disabled={isRefreshing}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
