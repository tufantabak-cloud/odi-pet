"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, AlertCircle } from "lucide-react";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
}

export function BarcodeScanner({
  onScanSuccess,
  onScanError,
  onClose,
  title = "Barkodu Okutun",
  description = "Mama paketindeki EAN/UPC barkodunu kameraya doğrulayın.",
}: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "barcode-reader";

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          if (isMounted) setHasPermission(true);

          const html5QrCode = new Html5Qrcode(regionId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128
            ],
            verbose: false,
          });
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: { width: 280, height: 160 },
              aspectRatio: 1.77,
            },
            (decodedText) => {
              const cleanText = decodedText.trim();
              if (scannerRef.current?.isScanning) {
                html5QrCode.stop().then(() => {
                  onScanSuccess(cleanText);
                }).catch((err) => {
                  console.error("Barcode scanner stop error", err);
                  onScanSuccess(cleanText);
                });
              }
            },
            (errorMessage) => {
              if (onScanError) onScanError(errorMessage);
            }
          );
        } else {
          if (isMounted) {
            setHasPermission(false);
            setErrorMsg("Cihazınızda kullanılabilir bir kamera bulunamadı. Lütfen barkod numarasını el ile yazın.");
          }
        }
      } catch (err) {
        console.warn("Kamera erişimi reddedildi veya hata oluştu:", err);
        if (isMounted) {
          setHasPermission(false);
          setErrorMsg("Kamera izni verilemedi. Lütfen barkod numarasını el ile yazın.");
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
    <div className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-sm sm:p-6 p-4 animate-fadeIn">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h2 className="text-xl font-extrabold text-text-primary">{title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-bg-main text-text-secondary hover:text-text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <p className="text-text-secondary text-center mb-6 text-sm font-medium">
          {description}
        </p>

        <div className="relative w-full aspect-[4/3] max-w-[320px] mx-auto overflow-hidden rounded-3xl bg-bg-main border border-border-main flex items-center justify-center shadow-inner">
          {hasPermission === null ? (
            <div className="flex flex-col items-center text-text-secondary gap-3">
              <Camera className="w-8 h-8 animate-pulse text-primary" />
              <span className="text-sm font-bold">Kamera başlatılıyor...</span>
            </div>
          ) : hasPermission === false ? (
            <div className="flex flex-col items-center text-center p-6 text-red-600 gap-3">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm font-bold">{errorMsg}</span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="mt-3 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold min-h-[44px]"
                >
                  El ile Barkod Gir
                </button>
              )}
            </div>
          ) : null}

          <div id={regionId} className="w-full h-full object-cover absolute inset-0 z-10 [&>video]:object-cover" />

          {/* Barcode Frame Overlay */}
          {hasPermission && (
            <div className="absolute inset-0 z-20 pointer-events-none border-[30px] border-black/30 rounded-3xl flex items-center justify-center">
              <div className="w-full h-[120px] border-2 border-dashed border-primary rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
