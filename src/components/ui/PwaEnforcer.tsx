"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWebPush } from "@/hooks/useWebPush";
import { shouldShowGlobalNotificationGate } from "@/lib/notifications/pwa-enforcer-policy";
import { Share, PlusSquare, Compass } from "lucide-react";

export default function PwaEnforcer() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [enforceType, setEnforceType] = useState<"pwa" | "notification">("pwa");
  const [os, setOs] = useState<"ios" | "android" | "other">("other");
  const [isInApp, setIsInApp] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showPostInstallGuide, setShowPostInstallGuide] = useState(false);

  const {
    subscribe,
    isSubscribed,
    isInitializing,
    isLoading,
    error: pushError,
    permission: pushPermission,
  } = useWebPush();

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    setIsMounted(true);

    if (typeof window === "undefined") return;

    const dismissedAt = localStorage.getItem('pwa_enforcer_dismissed');
    if (dismissedAt) {
      const daysPassed = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 7) {
        setDismissed(true);
        setShouldShow(false);
        return;
      }
    }

    if (dismissed) {
      setShouldShow(false);
      return;
    }

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

    // Determine OS & In-App Browser
    const lowerUa = userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/i.test(lowerUa);
    const isSafariBrowser = /^((?!chrome|android|crios|fxios|opera|biambrowser).)*safari/i.test(lowerUa);
    const inAppDetected = /fban|fbav|instagram|micromessenger|line\/|twitter|telegram|linkedin|crios|fxios|wv/i.test(lowerUa) || (isIosDevice && !isSafariBrowser);
    
    setIsInApp(inAppDetected);

    if (isIosDevice) {
      setOs("ios");
      setShowIosGuide(true);
    } else if (/android/i.test(lowerUa)) {
      setOs("android");
    } else {
      setOs("other");
    }

    // 3. Standalone (PWA installed) check
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    if (!isStandalone) {
      // PWA is enforced if not dismissed
      setEnforceType("pwa");
      setShouldShow(true);
    } else if (shouldShowGlobalNotificationGate({
      pathname,
      permission: pushPermission,
      isSubscribed,
      isInitializing,
    })) {
      setEnforceType("notification");
      setShouldShow(true);
    } else {
      setShouldShow(false);
    }
  }, [dismissed, isInitializing, isSubscribed, pathname, pushPermission]);

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
      try {
        await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step_key: 'onb_notification' })
        });
      } catch (e) {
        console.error('Failed to sync notification step', e);
      }
      setShouldShow(false);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPostInstallGuide(true);
      }
    } else if (os === 'ios') {
      setShowIosGuide(true);
    } else {
      setShowPostInstallGuide(true);
    }
  };



  if (!isMounted || !shouldShow || dismissed) return null;

  // ── ENFORCE NOTIFICATION ─────────────────────────────────────────
  if (enforceType === "notification") {
    return (
      <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0F0C20] via-[#15102A] to-[#0A0718] p-6 text-white overflow-y-auto">
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-violet-600/20 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-pink-600/20 blur-[80px] pointer-events-none" />

        <div className="relative w-full max-w-md bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-modal p-6 md:p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
          
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
            <div className="w-full space-y-3">
              {pushError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl border border-red-400/20 bg-red-500/10 text-left text-[12px] font-semibold text-red-200"
                >
                  {pushError}
                </div>
              )}
              <button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : '🔔'}
                {pushPermission === 'granted'
                  ? 'Cihaz Kaydını Tamamla'
                  : 'Bildirimleri Etkinleştir'}
              </button>
            </div>
          )}

          <button
            onClick={() => {
              localStorage.setItem(
                'pwa_enforcer_dismissed',
                Date.now().toString()
              )
              setDismissed(true)
            }}
            className="text-[13px] text-white/60 underline mt-4 py-2 px-4"
          >
            Şimdilik Atla
          </button>

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
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-violet-600/20 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-pink-600/20 blur-[80px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-modal p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
        
        <div className="w-24 h-24 rounded-modal mb-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-500 flex items-center justify-center bg-white overflow-hidden p-1">
          <Image src="/brand/app-icons/odi-icon-512.png" alt="Odi.Pet Logo" width={96} height={96} className="w-full h-full object-contain rounded-[20px]" />
        </div>

        {showPostInstallGuide ? (
          <div className="flex flex-col items-center w-full animate-in zoom-in-95 duration-300">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent mb-4">
              Yükleme Tamamlanıyor...
            </h1>
            <p className="text-base text-zinc-300 mb-8 leading-relaxed max-w-[280px]">
              Yükleme işlemi tamamlandığında, lütfen telefonunuzun <strong className="text-white">ana ekranından</strong> Odi.Pet uygulamasına tıklayarak giriş yapınız.
            </p>

          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent mb-2">
              Odi.Pet'e Hoş Geldiniz!
            </h1>
            
            <p className="text-[14px] text-zinc-400 mb-6 leading-relaxed max-w-[280px]">
              Uygulamamızı kullanmaya devam edebilmek için cihazınıza yüklemeniz gerekmektedir.
            </p>

            {showIosGuide && os === 'ios' ? (
              <div className="w-full text-left space-y-4 mb-6 animate-in slide-in-from-top-4 duration-300">
                {isInApp && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-[13px]">
                      <Compass className="w-4 h-4 shrink-0 text-amber-400" />
                      Safari ile Açmanız Gerekmektedir
                    </div>
                    <p className="text-[12px] text-zinc-300 leading-relaxed">
                      Şu an bir uygulama içi tarayıcıdasınız. iOS kuralları gereği uygulamayı yüklemek için ekranın altındaki <strong className="text-white">üç nokta (...)</strong> menüsüne basıp <strong className="text-amber-200">'Safari'de Aç'</strong> demeniz gereklidir.
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-[13px]">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                      Paylaş Simgesine Dokunun
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        <Share className="w-3.5 h-3.5" />
                      </span>
                    </h3>
                    <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">
                      Safari'nin alt barında yer alan <strong className="text-zinc-200">Paylaş</strong> <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-mono text-violet-300">⎋ (Kare & Yukarı Ok)</span> simgesine dokunun.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400 font-bold text-[13px]">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                      Ana Ekrana Ekleyin
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        <PlusSquare className="w-3.5 h-3.5" />
                      </span>
                    </h3>
                    <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">
                      Açılan menüyü aşağı kaydırıp <strong className="text-zinc-200">"Ana Ekrana Ekle"</strong> seçeneğine dokunun.
                    </p>
                  </div>
                </div>
                
                <p className="text-[12px] text-center text-zinc-500 italic mt-2 mb-4">
                  En iyi deneyim için Safari önerilir. Ekleme bittikten sonra aşağıdaki butona basabilirsiniz.
                </p>

                <button
                  onClick={() => setShowPostInstallGuide(true)}
                  className="btn-primary w-full py-4"
                >
                  Ekledim, Devam Et
                </button>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="btn-primary w-full py-4"
              >
                Hemen Yükle
              </button>
            )}
          </>
        )}

        <button
          onClick={() => {
            localStorage.setItem(
              'pwa_enforcer_dismissed',
              Date.now().toString()
            )
            setDismissed(true)
          }}
          className="text-[13px] text-white/60 underline mt-4 py-2 px-4"
        >
          Şimdilik Atla
        </button>

      </div>
    </div>
  );
}
