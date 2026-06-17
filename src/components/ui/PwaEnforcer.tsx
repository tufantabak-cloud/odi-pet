"use client";

import { useEffect, useState } from "react";
import { useWebPush } from "@/hooks/useWebPush";

export default function PwaEnforcer() {
  const [isMounted, setIsMounted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [enforceType, setEnforceType] = useState<"pwa" | "notification">("pwa");
  const [os, setOs] = useState<"ios" | "android" | "other">("other");

  const { subscribe, isLoading, permission: pushPermission } = useWebPush();

  useEffect(() => {
    setIsMounted(true);

    if (typeof window === "undefined") return;

    // 1. Bypass check
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.");
    const hasBypassParam = window.location.search.includes("bypass-pwa=true") || window.location.search.includes("test=true");
    const isPlaywright = navigator.userAgent.includes("Playwright");

    if (isLocal || hasBypassParam || isPlaywright) {
      setShouldShow(false);
      return;
    }

    // 2. Mobile check
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());

    if (!isMobileDevice) {
      setShouldShow(false);
      return;
    }

    // Determine OS
    if (/iphone|ipad|ipod/i.test(userAgent.toLowerCase())) {
      setOs("ios");
    } else if (/android/i.test(userAgent.toLowerCase())) {
      setOs("android");
    } else {
      setOs("other");
    }

    // 3. Standalone (PWA installed) check
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    const hasNotificationPermission = Notification.permission === 'granted';

    if (!isStandalone) {
      setEnforceType("pwa");
      setShouldShow(true);
    } else if (!hasNotificationPermission) {
      setEnforceType("notification");
      setShouldShow(true);
    } else {
      setShouldShow(false);
    }
  }, [pushPermission]);

  // Prevent scroll if visible
  useEffect(() => {
    if (shouldShow) {
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
  }, [shouldShow]);

  const handleEnableNotifications = async () => {
    const result = await subscribe();
    if (result.success) {
      setShouldShow(false);
    }
  };

  if (!isMounted || !shouldShow) return null;

  // ── ENFORCE NOTIFICATION ─────────────────────────────────────────
  if (enforceType === "notification") {
    return (
      <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0F0C20] via-[#15102A] to-[#0A0718] p-6 text-white overflow-y-auto">
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-violet-600/20 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-pink-600/20 blur-[80px] pointer-events-none" />

        <div className="relative w-full max-w-md bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
          
          {/* Notification Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-500 to-primary p-4 flex items-center justify-center mb-6 shadow-[0_8px_24px_rgba(108,92,231,0.3)] animate-bounce">
            <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent mb-2">
            Bildirimler Gerekli!
          </h1>
          
          <p className="text-[14px] text-zinc-400 mb-8 leading-relaxed max-w-[290px]">
            Odi.Pet'in aşı, tedavi ve önemli sağlık hatırlatmalarını anında alabilmeniz için bildirim izinlerini açmanız <strong>zorunludur</strong>.
          </p>

          {pushPermission === 'denied' ? (
            <div className="w-full space-y-5 text-left">
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl">
                <p className="text-[13px] font-bold text-warning mb-1">Bildirim İzni Engellenmiş</p>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  Daha önce bildirimleri engellediğiniz için otomatik izin isteyemiyoruz. Lütfen aşağıdaki adımlarla manuel olarak etkinleştirin:
                </p>
              </div>

              {os === 'ios' ? (
                <div className="text-[13px] text-zinc-300 space-y-2.5 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                  <p><strong>1.</strong> iPhone/iPad'inizde <strong className="text-white">Ayarlar</strong> uygulamasını açın.</p>
                  <p><strong>2.</strong> <strong className="text-white">Bildirimler</strong> &gt; <strong className="text-white">Odi.Pet</strong> yolunu izleyin.</p>
                  <p><strong>3.</strong> <strong className="text-white">Bildirimlere İzin Ver</strong> seçeneğini aktif yapın ve uygulamayı yeniden başlatın.</p>
                </div>
              ) : (
                <div className="text-[13px] text-zinc-300 space-y-2.5 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                  <p><strong>1.</strong> Tarayıcınızın adres çubuğunun solundaki <strong className="text-white">Kilit / Ayarlar 🔒</strong> simgesine dokunun.</p>
                  <p><strong>2.</strong> <strong className="text-white">Site Ayarları / İzinler</strong> menüsüne gidin.</p>
                  <p><strong>3.</strong> <strong className="text-white">Bildirimler</strong> seçeneğini <strong className="text-white">İzin Ver</strong> olarak güncelleyin.</p>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="w-full py-4 bg-primary text-white font-extrabold text-[15px] rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : '🔔'}
              Bildirimleri Etkinleştir
            </button>
          )}

          <div className="mt-8 pt-6 border-t border-white/[0.06] w-full text-center">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Mia'nın sağlığını şansa bırakmayın. Bildirimler olmadan aşı hatırlatıcıları çalışamaz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── ENFORCE PWA INSTALL ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0F0C20] via-[#15102A] to-[#0A0718] p-6 text-white overflow-y-auto">
      {/* Decorative Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-violet-600/20 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-pink-600/20 blur-[80px] pointer-events-none" />

      {/* Main Content Card */}
      <div className="relative w-full max-w-md bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
        
        {/* Brand Logo/Visual */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#FF6B6B] to-[#FF8E53] p-4 flex items-center justify-center mb-6 shadow-[0_8px_24px_rgba(255,107,107,0.3)] animate-pulse">
          {/* Logo SVG (Paw and Heart hybrid for Odi.Pet) */}
          <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35zM8.5 7.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm7 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent mb-2">
          Odi.Pet'e Hoş Geldiniz!
        </h1>
        
        <p className="text-[14px] text-zinc-400 mb-8 leading-relaxed max-w-[280px]">
          Uygulamamızı kullanmaya devam edebilmek için ana ekranınıza yüklemeniz gerekmektedir.
        </p>

        {/* Dynamic OS Guide */}
        <div className="w-full space-y-5 text-left">
          
          {os === "ios" ? (
            <>
              {/* iOS Instructions */}
              <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-zinc-100 flex items-center gap-1.5">
                    Paylaş Menüsünü Açın
                  </h3>
                  <p className="text-[13px] text-zinc-400 mt-1">
                    Tarayıcınızın alt veya üst barında yer alan <strong className="text-zinc-200">Paylaş</strong> (yukarı oklu kare) butonuna dokunun.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-zinc-100">
                    Ana Ekrana Ekleyin
                  </h3>
                  <p className="text-[13px] text-zinc-400 mt-1">
                    Açılan menü seçeneklerini aşağı kaydırarak <strong className="text-zinc-200">"Ana Ekrana Ekle"</strong> seçeneğini bulun ve dokunun.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-zinc-100">
                    İşlemi Tamamlayın
                  </h3>
                  <p className="text-[13px] text-zinc-400 mt-1">
                    Sağ üst köşedeki <strong className="text-zinc-200">"Ekle"</strong> butonuna basarak Odi.Pet kısayolunu oluşturun.
                  </p>
                </div>
              </div>
            </>
          ) : os === "android" ? (
            <>
              {/* Android Instructions */}
              <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-zinc-100">
                    Menüyü Açın
                  </h3>
                  <p className="text-[13px] text-zinc-400 mt-1">
                    Tarayıcınızın sağ üst köşesinde yer alan <strong className="text-zinc-200">üç nokta</strong> (menü) simgesine dokunun.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-zinc-100">
                    Uygulamayı Yükleyin
                  </h3>
                  <p className="text-[13px] text-zinc-400 mt-1">
                    Açılan menüden <strong className="text-zinc-200">"Ana Ekrana Ekle"</strong> ya da <strong className="text-zinc-200">"Uygulamayı Yükle"</strong> seçeneğine tıklayın.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-zinc-100">
                    Onaylayın ve Başlatın
                  </h3>
                  <p className="text-[13px] text-zinc-400 mt-1">
                    Ekrana gelen onay penceresinde <strong className="text-zinc-200">"Ekle / Yükle"</strong> seçeneğini seçerek işlemi tamamlayın.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Fallback Instructions (General Mobile Browser) */}
              <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-zinc-100">
                    Paylaş veya Menü Butonunu Bulun
                  </h3>
                  <p className="text-[13px] text-zinc-400 mt-1">
                    Tarayıcınızın <strong className="text-zinc-200">Paylaş</strong> veya <strong className="text-zinc-200">Menü / Ayarlar</strong> simgesine dokunun.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-zinc-100">
                    Ana Ekrana Ekleyin
                  </h3>
                  <p className="text-[13px] text-zinc-400 mt-1">
                    Seçenekler arasından <strong className="text-zinc-200">"Ana Ekrana Ekle"</strong> veya <strong className="text-zinc-200">"Ana Ekrana Kısayol Ekle"</strong> seçeneğini tıklayın.
                  </p>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] w-full text-center">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Kurulum bittikten sonra ana ekranınızdaki <strong className="text-zinc-400">Odi.Pet</strong> ikonuna tıklayarak kaldığınız yerden devam edebilirsiniz.
          </p>
        </div>

      </div>
    </div>
  );
}
