"use client";

import { useState, useRef } from "react";
import { Camera, X, Check, Loader2, UploadCloud } from "lucide-react";

interface VaccineScannerProps {
  onSave: (data: any) => void;
  onClose: () => void;
}

export function VaccineScanner({ onSave, onClose }: VaccineScannerProps) {
  const [step, setStep] = useState<"instructions" | "processing" | "confirm">("instructions");
  const [parsedData, setParsedData] = useState<any>({
    title: "",
    due_date: "",
    notes: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Dosya seçildi/fotoğraf çekildi, işleme geç
      setStep("processing");

      // Simüle edilmiş OCR işlemi
      setTimeout(() => {
        const today = new Date().toISOString().split("T")[0];
        setParsedData({
          title: "Karma Aşı",
          due_date: today,
          notes: "Taranan Aşı: Karma"
        });
        setStep("confirm");
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50/95 backdrop-blur-sm sm:p-6 p-0 overflow-y-auto">
      <div className="flex items-center justify-between p-4 sm:p-0 mb-4 bg-white sm:bg-transparent sticky top-0 z-10 border-b border-border-main sm:border-0 shadow-sm sm:shadow-none">
        <h2 className="text-xl font-bold text-slate-800">
          {step === "instructions" ? "Aşı Kartı Tarama" : 
           step === "processing" ? "İşleniyor" : "Bilgileri Onayla"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 sm:p-0">
        
        {step === "instructions" && (
          <div className="flex flex-col items-center w-full animate-fadeIn">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-6 text-teal-600">
              <Camera className="w-10 h-10" />
            </div>
            
            <h1 className="text-[28px] font-extrabold text-slate-800 mb-6 text-center">Aşı Kartını Net Çekin</h1>
            
            <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">1</div>
                <p className="text-slate-600 font-medium">Kartı düz bir zemine yerleştirin.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">2</div>
                <p className="text-slate-600 font-medium">Yeterli ışık olduğundan emin olun.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">3</div>
                <p className="text-slate-600 font-medium">Parlama yapmamasına dikkat edin.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">4</div>
                <p className="text-slate-600 font-medium">Tüm bilgilerin kadraja sığdığından emin olun.</p>
              </div>
            </div>

            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef}
              onChange={handleCapture}
              className="hidden"
            />

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Camera className="w-5 h-5" />
              Fotoğraf Çek
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              *Fotoğrafınız sunucularımızda güvende kalır ve analiz sonrası hemen silinir.
            </p>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center w-full animate-fadeIn h-64">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-6" />
            <h2 className="text-[22px] font-extrabold text-slate-800 mb-2">Aşı Kartı Taranıyor...</h2>
            <p className="text-slate-500 font-medium">Bilgileriniz işlenirken lütfen bekleyin.</p>
          </div>
        )}

        {step === "confirm" && (
          <div className="flex flex-col w-full animate-fadeIn pb-20">
            <div className="mb-6 text-center">
              <h2 className="text-[26px] font-extrabold text-slate-800 mb-2">Bilgileri Onaylayın</h2>
              <p className="text-slate-600">Aşı bilgilerini gözden geçirin. Yanlışlık varsa düzenleyebilirsiniz.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="text-[13px] font-bold text-slate-500 mb-1 block">Aşı Adı</label>
                <input 
                  type="text" 
                  value={parsedData.title}
                  onChange={(e) => setParsedData({...parsedData, title: e.target.value})}
                  className="w-full text-slate-800 font-semibold text-[16px] bg-transparent border-b border-slate-200 pb-2 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="text-[13px] font-bold text-slate-500 mb-1 block">Uygulama Tarihi</label>
                <input 
                  type="date" 
                  value={parsedData.due_date}
                  onChange={(e) => setParsedData({...parsedData, due_date: e.target.value})}
                  className="w-full text-slate-800 font-semibold text-[16px] bg-transparent border-b border-slate-200 pb-2 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="text-[13px] font-bold text-slate-500 mb-1 block">Not / Marka</label>
                <input 
                  type="text" 
                  value={parsedData.notes}
                  onChange={(e) => setParsedData({...parsedData, notes: e.target.value})}
                  className="w-full text-slate-800 font-semibold text-[16px] bg-transparent border-b border-slate-200 pb-2 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <button 
              onClick={() => onSave(parsedData)}
              className="mt-8 w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Check className="w-5 h-5" />
              Kaydet ve Devam Et
            </button>
            <button 
              onClick={() => setStep("instructions")}
              className="mt-4 w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              Yeniden Fotoğraf Çek
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
