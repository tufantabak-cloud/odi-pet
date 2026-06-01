"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, Check, Loader2, ImageIcon, AlertCircle } from "lucide-react";

interface SmartScannerProps {
  petId?: string;
  onSave: (data: any) => void;
  onClose: () => void;
}

export function SmartScanner({ petId, onSave, onClose }: SmartScannerProps) {
  const [step, setStep] = useState<"ready" | "camera" | "adjust" | "processing" | "confirm" | "error" | "saving">("ready");
  const [parsedData, setParsedData] = useState<any>({});
  const [recordType, setRecordType] = useState<string>("unknown");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setStep("camera");
      // Wait for element to render before setting srcObject
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.warn("Kamera erişilemez durumda, fallback olarak dosya seçici açılıyor:", err);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleImageSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setTempImageSrc(e.target?.result as string);
      setRotation(0);
      setStep("adjust");
    };
    reader.readAsDataURL(file);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      // Video çözünürlüğünü yakala
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "captured_doc.jpg", { type: "image/jpeg" });
            stopCamera();
            handleImageSelected(file);
          }
        }, "image/jpeg", 0.95);
      }
    }
  };

  const applyAdjustmentAndScan = () => {
    if (!tempImageSrc) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const isRotated90or270 = rotation === 90 || rotation === 270;
      const width = isRotated90or270 ? img.height : img.width;
      const height = isRotated90or270 ? img.width : img.height;

      // Target aspect ratio 3:4 (matches guide container)
      let cropWidth = width;
      let cropHeight = (width * 4) / 3;

      if (cropHeight > height) {
        cropHeight = height;
        cropWidth = (height * 3) / 4;
      }

      const cropX = (width - cropWidth) / 2;
      const cropY = (height - cropHeight) / 2;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Apply transformations and draw image centered
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Translate back to draw
      if (rotation === 0) {
        ctx.drawImage(img, -width / 2 - cropX, -height / 2 - cropY, width, height);
      } else if (rotation === 90) {
        ctx.drawImage(img, -height / 2 - cropY, -width / 2 - cropX, height, width);
      } else if (rotation === 180) {
        ctx.drawImage(img, -width / 2 - cropX, -height / 2 - cropY, width, height);
      } else if (rotation === 270) {
        ctx.drawImage(img, -height / 2 - cropY, -width / 2 - cropX, height, width);
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "adjusted_doc.jpg", { type: "image/jpeg" });
          processFile(file);
        }
      }, "image/jpeg", 0.92);
    };
    img.src = tempImageSrc;
  };

  const processFile = async (file: File) => {
    setStep("processing");

    // Kullanım sayısını artır
    const usageCount = parseInt(localStorage.getItem('smart_scanner_usage') || '0');
    localStorage.setItem('smart_scanner_usage', (usageCount + 1).toString());

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (petId) {
        formData.append("pet_id", petId);
      }

      const res = await fetch("/api/scan-document", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Metin okunamadı.");
      }

      setRecordType(data.data.record_type);
      setParsedData(data.data.parsed || {});
      setStep("confirm");

    } catch (err: any) {
      setErrorMessage(err.message || "Tarama sırasında bir hata oluştu.");
      setStep("error");
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleImageSelected(file);
    }
  };

  const handleConfirm = async () => {
    if (recordType === "food_packaging") {
      if (!parsedData.daily_grams || !parsedData.meals_per_day) {
        setValidationError("Mama stok hesaplaması için lütfen 'Günlük Tüketim' ve 'Öğün Sayısı' alanlarını doldurunuz.");
        return;
      }
    }
    setValidationError("");
    setStep("saving");
    try {
      const res = await fetch("/api/scan-document/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_id: petId,
          record_type: recordType,
          parsed_data: parsedData
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kaydedilirken bir hata oluştu.");
      }

      onSave(parsedData); // Üst bileşeni bilgilendir
    } catch (err: any) {
      setErrorMessage(err.message || "Kayıt sırasında bir hata oluştu.");
      setStep("error");
    }
  };

  const renderConfirmFields = () => {
    if (recordType === "food_packaging") {
      return (
        <div className="flex flex-col gap-4 mb-4">
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl border border-yellow-200 flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium leading-tight">Bu işlem beslenme profilinizi ve stok bilgilerinizi güncelleyecektir. Paket gramajını doğru seçtiğinizden emin olun.</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-1">
              <label className="text-[12px] font-bold text-slate-500 mb-1 block">Hedef Tür</label>
              <select value={parsedData.target_species || ""} onChange={(e) => setParsedData({...parsedData, target_species: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none">
                <option value="">Seçiniz</option>
                <option value="dog">Köpek</option>
                <option value="cat">Kedi</option>
                <option value="bird">Kuş</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-1">
              <label className="text-[12px] font-bold text-slate-500 mb-1 block">Yaş Grubu</label>
              <select value={parsedData.target_age_group || ""} onChange={(e) => setParsedData({...parsedData, target_age_group: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none">
                <option value="">Seçiniz</option>
                <option value="kitten">Yavru (0-1 yaş)</option>
                <option value="adult">Yetişkin (1-7 yaş)</option>
                <option value="senior">Yaşlı (7-12 yaş)</option>
                <option value="senior_plus">Yaşlı (12+ yaş)</option>
                <option value="all">Tüm Yaşlar</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[12px] font-bold text-slate-500 mb-1 block">Marka</label>
            <input type="text" value={parsedData.food_brand || ""} onChange={(e) => setParsedData({...parsedData, food_brand: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none focus:border-b-2 border-primary" />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[12px] font-bold text-slate-500 mb-1 block">Ürün Adı</label>
            <input type="text" value={parsedData.food_product || ""} onChange={(e) => setParsedData({...parsedData, food_product: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none focus:border-b-2 border-primary" />
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-primary/40 shadow-sm bg-primary/5">
            <label className="text-[12px] font-bold text-primary mb-1 block flex items-center gap-1">Paket Boyutu (Gram) <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md ml-auto">Kritik</span></label>
            <input type="number" value={parsedData.package_size_grams || ""} onChange={(e) => setParsedData({...parsedData, package_size_grams: e.target.value})} className="w-full font-extrabold text-[16px] text-primary bg-transparent focus:outline-none" />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[12px] font-bold text-slate-500 mb-1 block">Mevcut Stok (Gram)</label>
            <input type="number" placeholder="Evde kalan mamanız varsa yazınız" value={parsedData.existing_stock_grams || ""} onChange={(e) => setParsedData({...parsedData, existing_stock_grams: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none focus:border-b-2 border-primary" />
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl border-2 border-orange-500/40 shadow-sm bg-orange-500/5 flex-1">
              <label className="text-[12px] font-bold text-orange-600 mb-1 block flex items-center gap-1">Günlük Tüketim (Gram) <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-md ml-auto">Yeni</span></label>
              <input type="number" placeholder="Örn: 150" value={parsedData.daily_grams || ""} onChange={(e) => setParsedData({...parsedData, daily_grams: e.target.value})} className="w-full font-extrabold text-[15px] text-orange-600 bg-transparent focus:outline-none" />
            </div>
            <div className="bg-white p-4 rounded-2xl border-2 border-orange-500/40 shadow-sm bg-orange-500/5 flex-1">
              <label className="text-[12px] font-bold text-orange-600 mb-1 block flex items-center gap-1">Öğün Sayısı <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-md ml-auto">Yeni</span></label>
              <input type="number" placeholder="Örn: 2" value={parsedData.meals_per_day || ""} onChange={(e) => setParsedData({...parsedData, meals_per_day: e.target.value})} className="w-full font-extrabold text-[15px] text-orange-600 bg-transparent focus:outline-none" />
            </div>
          </div>
          
          {(() => {
            const packageSize = Number(parsedData.package_size_grams) || 0;
            const existingStock = Number(parsedData.existing_stock_grams) || 0;
            const dailyGrams = Number(parsedData.daily_grams) || 0;
            const totalStock = packageSize + existingStock;
            
            if (totalStock > 0 && dailyGrams > 0) {
              const days = Math.floor(totalStock / dailyGrams);
              const date = new Date();
              date.setDate(date.getDate() + days);
              const estimatedDateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
              return (
                <div className="bg-green-50 text-green-800 p-3 rounded-xl border border-green-200 mt-2 text-center">
                  <p className="text-[12px] font-medium opacity-80 mb-1">Tahmini Mamanın Bitiş Tarihi</p>
                  <p className="text-[16px] font-extrabold">{estimatedDateStr} <span className="text-[12px] font-medium opacity-80">({days} gün)</span></p>
                </div>
              );
            }
            return <p className="text-[11px] text-slate-400 text-center -mt-2">Günlük tüketim girilirse mama bitiş tarihi otomatik hesaplanır.</p>;
          })()}
        </div>
      );
    }

    if (recordType === "vaccine_card") {
      return (
        <div className="flex flex-col gap-4 mb-4">
          <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-200 flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium leading-tight">Aşı tarihleri sağlık takviminizi etkiler. Lütfen tarihlerin karnedekiyle birebir aynı olduğundan emin olun.</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[12px] font-bold text-slate-500 mb-1 block">Aşı Adı</label>
            <input type="text" value={parsedData.title || ""} onChange={(e) => setParsedData({...parsedData, title: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none focus:border-b-2 border-primary" />
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl border-2 border-primary/40 shadow-sm bg-primary/5 flex-1">
              <label className="text-[12px] font-bold text-primary mb-1 block flex items-center gap-1">Uygulama <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md ml-auto">Kritik</span></label>
              <input type="date" value={parsedData.date || ""} onChange={(e) => setParsedData({...parsedData, date: e.target.value})} className="w-full font-extrabold text-[15px] text-primary bg-transparent focus:outline-none" />
            </div>
            <div className="bg-white p-4 rounded-2xl border-2 border-primary/40 shadow-sm bg-primary/5 flex-1">
              <label className="text-[12px] font-bold text-primary mb-1 block flex items-center gap-1">Sonraki <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md ml-auto">Kritik</span></label>
              <input type="date" value={parsedData.next_date || ""} onChange={(e) => setParsedData({...parsedData, next_date: e.target.value})} className="w-full font-extrabold text-[15px] text-primary bg-transparent focus:outline-none" />
            </div>
          </div>
        </div>
      );
    }

    if (recordType === "medicine_packaging") {
      return (
        <div className="flex flex-col gap-4 mb-4">
          <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-200 flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium leading-tight">Bu ilaç için sağlık takvimine hatırlatıcı kurulacaktır. Doz ve sürenin veteriner önerisiyle uyumlu olduğundan emin olun.</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[12px] font-bold text-slate-500 mb-1 block">İlaç Adı</label>
            <input type="text" value={parsedData.title || ""} onChange={(e) => setParsedData({...parsedData, title: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none focus:border-b-2 border-primary" />
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-primary/40 shadow-sm bg-primary/5">
            <label className="text-[12px] font-bold text-primary mb-1 block flex items-center gap-1">Doz <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md ml-auto">Kritik</span></label>
            <input type="text" value={parsedData.dose || ""} onChange={(e) => setParsedData({...parsedData, dose: e.target.value})} className="w-full font-extrabold text-[15px] text-primary bg-transparent focus:outline-none" />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[12px] font-bold text-slate-500 mb-1 block">Süre (Örn: 7 gün)</label>
            <input type="text" value={parsedData.duration || ""} onChange={(e) => setParsedData({...parsedData, duration: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none focus:border-b-2 border-primary" />
          </div>
        </div>
      );
    }

    if (recordType === "parasite_product") {
      return (
        <div className="flex flex-col gap-4 mb-4">
          <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-200 flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium leading-tight">Uygulama tarihi aşı ve koruma takviminizi güncelleyecektir. Sonraki dozu kaçırmamak için kontrol edin.</p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[12px] font-bold text-slate-500 mb-1 block">Ürün Adı</label>
            <input type="text" value={parsedData.title || ""} onChange={(e) => setParsedData({...parsedData, title: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none focus:border-b-2 border-primary" />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[12px] font-bold text-slate-500 mb-1 block">Tür (İç/Dış Parazit)</label>
            <select value={parsedData.parasite_type || ""} onChange={(e) => setParsedData({...parsedData, parasite_type: e.target.value})} className="w-full font-semibold text-[15px] bg-transparent focus:outline-none">
              <option value="Dış Parazit">Dış Parazit</option>
              <option value="İç Parazit">İç Parazit</option>
            </select>
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-primary/40 shadow-sm bg-primary/5">
            <label className="text-[12px] font-bold text-primary mb-1 block flex items-center gap-1">Sonraki Doz Tarihi <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md ml-auto">Kritik</span></label>
            <input type="date" value={parsedData.next_date || ""} onChange={(e) => setParsedData({...parsedData, next_date: e.target.value})} className="w-full font-extrabold text-[15px] text-primary bg-transparent focus:outline-none" />
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center mb-6">
        <p className="text-slate-600 font-medium">Bu belge tipi tam anlaşılamadı. Sadece metin içeriğini not olarak kaydedebiliriz veya tekrar deneyebilirsiniz.</p>
      </div>
    );
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[10010] flex flex-col bg-slate-50/95 backdrop-blur-sm sm:p-6 p-0 overflow-y-auto"
    >
      <div className="flex items-center justify-between p-4 sm:p-0 mb-4 bg-white sm:bg-transparent sticky top-0 z-10 border-b border-border-main sm:border-0 shadow-sm sm:shadow-none">
        <h2 className="text-xl font-bold text-slate-800">
          {step === "ready" ? "Akıllı Tarama" : 
           step === "processing" ? "Taranıyor" : 
           step === "error" ? "Tarama Hatası" : 
           step === "saving" ? "Kaydediliyor" : "Tarama Sonuçları"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 sm:p-0">
        
        {step === "ready" && (
          <div className="flex flex-col items-center w-full animate-fadeIn">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-5 text-primary">
              <Camera className="w-10 h-10" />
            </div>
            
            <h1 className="text-[26px] font-extrabold text-slate-800 mb-2 text-center">Akıllı Tarama</h1>
            <p className="text-slate-500 font-medium text-[14px] leading-relaxed mb-6 px-2 text-center">
              Aşı karnesi, mama, ilaç veya parazit ambalajlarını tarayarak bilgileri hızla kaydedin.
            </p>
            
            <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">1</div>
                <p className="text-slate-600 font-medium">Belgeyi düz bir zemine yerleştirin.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">2</div>
                <p className="text-slate-600 font-medium">Yeterli ışık olduğundan emin olun.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">3</div>
                <p className="text-slate-600 font-medium">Tüm yazıların kadraja sığdığından emin olun.</p>
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
            <input 
              type="file" 
              accept="image/*" 
              ref={galleryInputRef}
              onChange={handleCapture}
              className="hidden"
            />

            <div className="flex gap-3 w-full">
              <button 
                onClick={startCamera}
                className="flex-1 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.97] duration-200"
              >
                <Camera className="w-5 h-5" />
                Fotoğraf Çek
              </button>
              <button 
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 py-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border-2 border-slate-200 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.97] duration-200 hover:border-primary hover:text-primary"
              >
                <ImageIcon className="w-5 h-5" />
                Galeriden Seç
              </button>
            </div>
          </div>
        )}

        {step === "camera" && (
          <div className="flex flex-col items-center w-full animate-fadeIn relative h-[480px] sm:h-[500px] overflow-hidden rounded-[32px] border border-slate-200 bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover" 
            />
            
            {/* Visual Guide Overlay (Kadraj Kılavuzu) */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-6 z-10">
              <div className="text-center bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold py-2 px-4 rounded-full self-center mt-2 shadow-sm">
                Belgeyi veya ambalajı kılavuz çizgilerine hizalayın
              </div>
              
              {/* Target Frame Box */}
              <div className="w-[85%] aspect-[3/4] max-h-[280px] border-2 border-dashed border-white/80 rounded-[24px] self-center relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* L-corners for aesthetic camera overlay feel */}
                <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>

              <div className="h-10" /> {/* Spacer */}
            </div>

            {/* Controls Layer */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8 px-8 z-20">
              <button 
                onClick={() => { stopCamera(); setStep("ready"); }}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-90"
                title="İptal"
              >
                <X className="w-5 h-5" />
              </button>
              
              <button 
                onClick={capturePhoto}
                className="w-16 h-16 bg-white text-primary rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 border-4 border-primary/20"
                title="Fotoğraf Çek"
              >
                <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white">
                  <Camera className="w-5 h-5" />
                </div>
              </button>

              <button 
                onClick={() => {
                  stopCamera();
                  galleryInputRef.current?.click();
                }}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-90"
                title="Galeriden Seç"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === "adjust" && tempImageSrc && (
          <div className="flex flex-col items-center w-full animate-fadeIn">
            <h3 className="text-slate-800 font-extrabold text-[18px] mb-3 text-center">Görseli Ayarlayın</h3>
            <p className="text-slate-500 text-[13px] font-medium mb-4 text-center px-4">
              Görseli döndürerek kılavuzun içine sığmasını sağlayın. Analizi bozacak çevre nesneleri otomatik kırpılacaktır.
            </p>
            
            <div className="w-full aspect-[3/4] max-h-[300px] overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900 relative shadow-inner mb-6">
              {/* Image element with rotation applied */}
              <img 
                src={tempImageSrc} 
                alt="Ayarlanacak Belge" 
                style={{ transform: `rotate(${rotation}deg)` }}
                className="w-full h-full object-contain transition-transform duration-300"
              />
              
              {/* Outer Crop Indicator Guide (Yine 3:4 oranlı kadraj overlay'i) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                <div className="w-[85%] aspect-[3/4] border-2 border-dashed border-primary rounded-[20px] relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  {/* L Corners */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-md" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-md" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-md" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-md" />
                </div>
              </div>
            </div>

            {/* Rotation Control Toolbar */}
            <div className="flex justify-center gap-4 w-full mb-8">
              <button 
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:border-primary hover:text-primary transition-all hover:scale-[1.03]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Sola Döndür
              </button>
              
              <button 
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:border-primary hover:text-primary transition-all hover:scale-[1.03]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38L2.5 8"/></svg>
                Sağa Döndür
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => {
                  setTempImageSrc(null);
                  setStep("ready");
                }}
                className="flex-1 py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold border border-slate-200 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97]"
              >
                Yeniden Seç
              </button>
              <button 
                onClick={applyAdjustmentAndScan}
                className="flex-1 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.97]"
              >
                <Check className="w-5 h-5" />
                Kırp ve Tara
              </button>
            </div>
          </div>
        )}

        {(step === "processing" || step === "saving") && (
          <div className="flex flex-col items-center justify-center w-full animate-fadeIn h-64 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <h2 className="text-[22px] font-extrabold text-slate-800 mb-2">
              {step === "processing" ? "Odi Fotoğrafı İnceliyor..." : "Verileriniz Kaydediliyor..."}
            </h2>
            <p className="text-slate-500 font-medium">
              {step === "processing" ? "Yapay zeka içeriği tespit ediyor, lütfen bekleyin." : "İşlem tamamlanmak üzere."}
            </p>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center justify-center w-full animate-fadeIn text-center">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mb-6 text-error text-3xl">
              🚨
            </div>
            <h2 className="text-[24px] font-extrabold text-slate-800 mb-3">İşlem Hatası</h2>
            <p className="text-slate-600 font-medium mb-8 px-2">
              {errorMessage}
            </p>
            
            <button 
              onClick={() => setStep("ready")}
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 mb-3 transition-all active:scale-95"
            >
              Tekrar Dene
            </button>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-2xl transition-all"
            >
              Kapat
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="flex flex-col w-full animate-fadeIn pb-20">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between mb-6">
              <div>
                <span className="text-[12px] font-bold text-slate-400 block mb-1">Algılanan Kategori</span>
                <span className="font-extrabold text-primary text-[15px]">{
                  recordType === 'vaccine_card' ? '💉 Aşı Karnesi' :
                  recordType === 'medicine_packaging' ? '💊 İlaç Ambalajı' :
                  recordType === 'food_packaging' ? '🍖 Mama Ambalajı' : 
                  recordType === 'parasite_product' ? '🦟 Parazit İlacı' : 'Belirsiz Kategori'
                }</span>
              </div>
            </div>

            {renderConfirmFields()}

            {validationError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 text-[13px] font-medium mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{validationError}</p>
              </div>
            )}

            <div className="mt-4">
              <button 
                onClick={handleConfirm}
                className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 mb-3"
              >
                <Check className="w-5 h-5" />
                Onayla ve Kaydet
              </button>
              <button 
                onClick={() => setStep("ready")}
                className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold border border-slate-200 rounded-2xl flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98] duration-200"
              >
                Yeniden Fotoğraf Çek
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
