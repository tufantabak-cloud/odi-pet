"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, RefreshCcw } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
}

export function QRScanner({
  onScanSuccess,
  onScanError,
  onClose,
  title = "QR Kodu Tarayın",
  description = "Kameranızı QR koda doğru hizalayın.",
}: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "qr-reader";

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          if (isMounted) setHasPermission(true);
          
          const html5QrCode = new Html5Qrcode(regionId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          });
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (scannerRef.current?.isScanning) {
                html5QrCode.stop().then(() => {
                  onScanSuccess(decodedText);
                }).catch((err) => {
                  console.error("Scanner stop error", err);
                  onScanSuccess(decodedText);
                });
              }
            },
            (errorMessage) => {
              // Ignore frequent scan errors (not finding a code immediately)
              if (onScanError) onScanError(errorMessage);
            }
          );
        } else {
          if (isMounted) {
            setHasPermission(false);
            setErrorMsg("Cihazınızda kullanılabilir bir kamera bulunamadı.");
          }
        }
      } catch (err) {
        console.error("Error starting scanner", err);
        if (isMounted) {
          setHasPermission(false);
          setErrorMsg("Kamera izni alınamadı veya bir hata oluştu.");
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-sm sm:p-6 p-4">
      <div className="flex items-center justify-between mb-8 pt-4">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <p className="text-slate-600 text-center mb-8 text-sm sm:text-base">
          {description}
        </p>

        <div className="relative w-full aspect-square max-w-[300px] mx-auto overflow-hidden rounded-3xl bg-slate-100 shadow-inner flex items-center justify-center">
          {hasPermission === null ? (
            <div className="flex flex-col items-center text-slate-400 gap-3">
              <Camera className="w-8 h-8 animate-pulse" />
              <span className="text-sm font-medium">Kamera başlatılıyor...</span>
            </div>
          ) : hasPermission === false ? (
            <div className="flex flex-col items-center text-center p-6 text-rose-500 gap-3">
              <RefreshCcw className="w-8 h-8" />
              <span className="text-sm font-medium">{errorMsg}</span>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-sm font-bold"
              >
                Sayfayı Yenile
              </button>
            </div>
          ) : null}
          
          <div id={regionId} className="w-full h-full object-cover absolute inset-0 z-10 [&>video]:object-cover" />
          
          {/* Overlay mask for the scanning area */}
          {hasPermission && (
            <div className="absolute inset-0 z-20 pointer-events-none border-[40px] border-white/20 rounded-3xl" />
          )}
        </div>
      </div>
    </div>
  );
}
