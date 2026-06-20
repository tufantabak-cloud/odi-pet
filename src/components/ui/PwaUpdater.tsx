"use client";
 
import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
 
export default function PwaUpdater() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
 
  // updatefound listener'ının birden fazla eklenmesini önlemek için ref
  const updateFoundAttached = useRef(false);
  // "Sonra" butonundan gelen zamanlayıcıyı temizleyebilmek için ref
  const snoozeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
 
    // ?updated= parametresini URL'den temizle (analytics kirliliğini önler)
    const url = new URL(window.location.href);
    if (url.searchParams.has("updated")) {
      url.searchParams.delete("updated");
      window.history.replaceState({}, "", url.toString());
    }
 
    // ─────────────────────────────────────────────────────────────
    // 1. skipWaiting:true + clientsClaim:true kombinasyonu nedeniyle
    //    yeni SW bekleme olmadan doğrudan kontrolü devraldığında bu
    //    event tetiklenir. Serwist kurulumunda ana tetikleyici budur.
    // ─────────────────────────────────────────────────────────────
    const handleControllerChange = () => {
      setShowUpdate(true);
    };
 
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );
 
    // ─────────────────────────────────────────────────────────────
    // 2. Periyodik güncelleme kontrolü: uygulama görünür olduğunda
    //    SW kaydına güncelleme isteği gönder.
    //    updatefound → statechange:installed zinciriyle banner
    //    yalnızca SW tamamen hazır olduğunda açılır (erken açılmaz).
    // ─────────────────────────────────────────────────────────────
    const checkUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
 
        // Her checkUpdate çağrısında yeni listener eklenmesini önle
        if (!updateFoundAttached.current) {
          updateFoundAttached.current = true;
 
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
 
            // SW yükleme aşamalarını takip et; "installed" olmadan banner açma
            newWorker.addEventListener("statechange", () => {
              // skipWaiting:true olduğu için "waiting" aşaması pratikte
              // geçilmez; "installed" === hazır, hemen aktif olacak demektir.
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setShowUpdate(true);
              }
            });
          });
        }
 
        await reg.update();
      } catch (error) {
        console.error("SW güncelleme kontrolü başarısız:", error);
      }
    };
 
    checkUpdate();
 
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkUpdate();
      }
    };
 
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkUpdate);
 
    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkUpdate);
      if (snoozeTimer.current) clearTimeout(snoozeTimer.current);
    };
  }, []);
 
  // ─────────────────────────────────────────────────────────────
  // Hard Refresh: tüm SW cache'lerini sil, ardından cache-buster
  // URL'siyle sayfayı sıfırdan ağdan yükle.
  //
  // NOT: skipWaiting:true olduğu için reg.waiting kontrolü
  // pratikte hiçbir zaman eşleşmez; güvenlik ağı olarak bırakıldı.
  // ─────────────────────────────────────────────────────────────
  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 1. Tüm SW önbelleklerini temizle
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
 
      // 2. Cache-buster timestamp'i ekleyerek hard reload yap
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("updated", Date.now().toString());
      window.location.href = currentUrl.toString();
    } catch (e) {
      console.error("Cache temizleme hatası:", e);
      window.location.reload();
    }
  };
 
  // "Sonra" butonuna basıldığında 5 dakika sonra banneri tekrar göster.
  // iOS PWA'da controllerchange bir kez tetiklendiği için kullanıcı
  // bildirimi kapatırsa bir daha göremeyebilir; bu timer o açığı kapatır.
  const handleSnooze = () => {
    setShowUpdate(false);
    snoozeTimer.current = setTimeout(() => {
      setShowUpdate(true);
    }, 5 * 60 * 1000); // 5 dakika
  };
 
  if (!showUpdate) return null;
 
  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-96 z-[999999] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl shadow-2xl p-5 pr-12 relative overflow-hidden border border-white/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
 
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <RefreshCw
              className={`w-6 h-6 text-white ${
                isRefreshing
                  ? "animate-spin"
                  : "animate-[spin_3s_linear_infinite]"
              }`}
            />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-white font-black text-base">
              Yeni Sürüm Hazır! 🚀
            </h3>
            <p className="text-indigo-100 text-[13px] mt-1 mb-4 leading-relaxed font-medium">
              Odi.Pet için iyileştirmeler yüklendi. Hatalardan kurtulmak ve
              yeni özellikleri görmek için yenileyin.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleHardRefresh}
                disabled={isRefreshing}
                className="bg-white text-indigo-600 hover:bg-indigo-50 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-colors shadow-sm active:scale-95 disabled:opacity-70 disabled:active:scale-100"
              >
                {isRefreshing ? "Yenileniyor..." : "Hemen Yenile"}
              </button>
              <button
                onClick={handleSnooze}
                disabled={isRefreshing}
                className="bg-black/20 text-white hover:bg-black/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-95 disabled:opacity-70"
              >
                Sonra
              </button>
            </div>
          </div>
        </div>
 
        <button
          onClick={handleSnooze}
          disabled={isRefreshing}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
