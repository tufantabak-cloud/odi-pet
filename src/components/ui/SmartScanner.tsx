"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, X, Check, Loader2, ImageIcon, AlertCircle } from "lucide-react";

export interface ParsedScannerData {
  title?: string;
  brand?: string;
  product_name?: string;
  active_ingredient?: string;
  ingredient?: string;
  duration_days?: number;
  duration_months?: number;
  application_method?: string;
  parasite_type?: string;
  vaccine_name?: string;
  vaccine_brand?: string;
  composition?: string;
  target_species?: string;
  target_age_group?: string;
  food_brand?: string;
  food_product?: string;
  package_size_grams?: string | number;
  existing_stock_grams?: string | number;
  daily_grams?: string | number;
  meals_per_day?: string | number;
  date?: string;
  next_date?: string;
  dose?: string;
  duration?: string;
  [key: string]: string | number | undefined;
}

interface SmartScannerProps {
  petId?: string;
  onSave?: (data: ParsedScannerData) => void;
  onResult?: (data: ParsedScannerData) => void;
  onClose: () => void;
}

export function SmartScanner({ petId, onSave, onResult, onClose }: SmartScannerProps) {
  const [step, setStep] = useState<"ready" | "camera" | "adjust" | "processing" | "confirm" | "error" | "saving">("ready");
  const [parsedData, setParsedData] = useState<ParsedScannerData>({});
  const [recordType, setRecordType] = useState<string>("unknown");
  const [validationError, setValidationError] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
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
      setScale(1);
      setPosition({ x: 0, y: 0 });
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.current.x,
        y: touch.clientY - dragStart.current.y
      });
    }
  };

  const applyAdjustmentAndScan = () => {
    if (!tempImageSrc) return;

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const containerWidth = 300;
      const containerHeight = 400;

      canvas.width = 768; // High resolution crop output
      canvas.height = 1024;

      const scaleFactor = canvas.width / containerWidth;

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Translate to center + user drag offsets
      ctx.translate(
        canvas.width / 2 + position.x * scaleFactor, 
        canvas.height / 2 + position.y * scaleFactor
      );
      
      // Rotate
      ctx.rotate((rotation * Math.PI) / 180);
      
      // Scale (base containment scale * user zoom * high-res factor)
      const baseScale = Math.min(containerWidth / img.width, containerHeight / img.height);
      const finalScale = scale * baseScale * scaleFactor;
      ctx.scale(finalScale, finalScale);

      // Draw centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "adjusted_doc.jpg", { type: "image/jpeg" });
          processFile(file);
        }
      }, "image/jpeg", 0.95);
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
      setEditingField(null);
      setStep("confirm");

    } catch (err: unknown) {
      console.error("Tarama hatası:", err);
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
          category: 'Medikal',
          parsed_data: parsedData
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kaydedilirken bir hata oluştu.");
      }

      if (onSave) {
        onSave(parsedData); // Üst bileşeni bilgilendir
      }
    } catch (err: unknown) {
      console.error("Kayıt hatası:", err);
      setStep("error");
    }
  };

  const renderField = (key: string, label: string, value: string | number | undefined, type: string = "text", highlight: boolean = false, options?: {value: string, label: string}[]) => {
    const isEditing = editingField === key;
    
    return (
      <div className={`bg-white p-4 rounded-2xl shadow-sm cursor-pointer border-2 transition-colors ${highlight ? 'border-primary/40 bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => !isEditing && setEditingField(key)}>
        <label className={`text-[12px] font-bold mb-1 block flex items-center gap-1 ${highlight ? 'text-primary' : 'text-slate-500'}`}>
          {label} 
          {highlight && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md ml-auto">Kritik</span>}
          {!isEditing && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md ml-auto opacity-70">Düzenle</span>}
        </label>
        
        {isEditing ? (
          options ? (
            <select
              autoFocus
              value={value || ""}
              onChange={(e) => setParsedData({ ...parsedData, [key]: e.target.value })}
              onBlur={() => setEditingField(null)}
              className={`w-full font-extrabold text-[15px] bg-transparent focus:outline-none focus:border-b-2 ${highlight ? 'text-primary border-primary' : 'text-slate-800 border-slate-400'}`}
            >
              {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : (
            <input 
              autoFocus
              type={type} 
              value={value || ""} 
              onChange={(e) => setParsedData({ ...parsedData, [key]: e.target.value })}
              onBlur={() => setEditingField(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
              className={`w-full font-extrabold text-[15px] bg-transparent focus:outline-none focus:border-b-2 ${highlight ? 'text-primary border-primary' : 'text-slate-800 border-slate-400'}`}
            />
          )
        ) : (
          <div className={`w-full font-extrabold text-[15px] truncate ${highlight ? 'text-primary' : 'text-slate-800'}`}>
            {value ? (options ? options.find(o => o.value === value)?.label || value : value) : <span className="opacity-40 italic">Belirtilmemiş</span>}
          </div>
        )}
      </div>
    );
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
            <div className="flex-1">
              {renderField('target_species', 'Hedef Tür', parsedData.target_species, 'select', false, [
                {value: '', label: 'Seçiniz'}, {value: 'dog', label: 'Köpek'}, {value: 'cat', label: 'Kedi'}, {value: 'bird', label: 'Kuş'}, {value: 'other', label: 'Diğer'}
              ])}
            </div>
            <div className="flex-1">
              {renderField('target_age_group', 'Yaş Grubu', parsedData.target_age_group, 'select', false, [
                {value: '', label: 'Seçiniz'}, {value: 'kitten', label: 'Yavru (0-1 yaş)'}, {value: 'adult', label: 'Yetişkin (1-7 yaş)'}, {value: 'senior', label: 'Yaşlı (7-12 yaş)'}, {value: 'senior_plus', label: 'Yaşlı (12+ yaş)'}, {value: 'all', label: 'Tüm Yaşlar'}
              ])}
            </div>
          </div>

          {renderField('food_brand', 'Marka', parsedData.food_brand)}
          {renderField('food_product', 'Ürün Adı', parsedData.food_product)}
          {renderField('package_size_grams', 'Paket Boyutu (Gram)', parsedData.package_size_grams, 'number', true)}
          {renderField('existing_stock_grams', 'Mevcut Stok (Gram)', parsedData.existing_stock_grams, 'number')}
          
          <div className="flex gap-4">
            <div className="flex-1">
              {renderField('daily_grams', 'Günlük Tüketim (Gram)', parsedData.daily_grams, 'number', true)}
            </div>
            <div className="flex-1">
              {renderField('meals_per_day', 'Öğün Sayısı', parsedData.meals_per_day, 'number', true)}
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
          <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-200 flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium leading-tight">Bu bilgiler, taradığınız belgeden otomatik olarak alınmıştır. Gerekirse tıklayarak düzenleyebilirsiniz.</p>
          </div>

          {renderField('title', 'Aşı Adı', parsedData.title)}
          <div className="flex gap-4">
            <div className="flex-1">
              {renderField('date', 'Uygulama', parsedData.date, 'date', true)}
            </div>
            <div className="flex-1">
              {renderField('next_date', 'Sonraki Doz', parsedData.next_date, 'date', true)}
            </div>
          </div>
        </div>
      );
    }

    if (recordType === "medicine_packaging") {
      return (
        <div className="flex flex-col gap-4 mb-4">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-200 flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium leading-tight">Bu bilgiler, taradığınız belgeden otomatik olarak alınmıştır. Gerekirse tıklayarak düzenleyebilirsiniz.</p>
          </div>

          {renderField('title', 'İlaç Adı', parsedData.title)}
          {renderField('dose', 'Doz', parsedData.dose, 'text', true)}
          {renderField('duration', 'Süre (Örn: 7 gün)', parsedData.duration)}
        </div>
      );
    }

    if (recordType === "parasite_product") {
      return (
        <div className="flex flex-col gap-4 mb-4">
          <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-200 flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium leading-tight">Bu bilgiler, taradığınız belgeden otomatik olarak alınmıştır. Gerekirse tıklayarak düzenleyebilirsiniz.</p>
          </div>
          
          {renderField('title', 'Ürün Adı', parsedData.title)}
          {renderField('parasite_type', 'Tür (İç/Dış Parazit)', parsedData.parasite_type, 'select', false, [
            {value: 'Dış Parazit', label: 'Dış Parazit'},
            {value: 'İç Parazit', label: 'İç Parazit'}
          ])}
          {renderField('next_date', 'Sonraki Doz Tarihi', parsedData.next_date, 'date', true)}
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
           step === "camera" ? "Belge Tara" : 
           step === "adjust" ? "Belgeyi İncele" : 
           step === "error" ? "Belge Bulunamadı" : 
           step === "saving" ? "Kaydediliyor" : editingField ? "Bilgileri Düzenle" : "Taranan Bilgileri Onayla"}
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
                Belgeyi düz ve aydınlık bir zemine yerleştirin
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
          <div className="flex flex-col items-center w-full animate-fadeIn select-none">
            <h3 className="text-slate-800 font-extrabold text-[18px] mb-3 text-center">Belgeyi İncele</h3>
            <p className="text-slate-500 text-[13px] font-medium mb-4 text-center px-4">
              Görseli sürükleyip yakınlaştırarak kılavuz çizgileri arasına hizalayın.
            </p>
            
            <div 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              className="w-full aspect-[3/4] max-h-[300px] overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900 relative shadow-inner mb-4 select-none touch-none"
            >
              {/* Image element with rotation, scale and translation applied */}
              <Image 
                src={tempImageSrc} 
                alt="Ayarlanacak Belge" 
                fill
                style={{ 
                  transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                }}
                className="object-contain pointer-events-none"
              />
              
              {/* Outer Crop Indicator Guide (Yine 3:4 oranlı kadraj overlay'i) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 z-10">
                <div className="w-[85%] aspect-[3/4] border-2 border-dashed border-primary rounded-[20px] relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  {/* L Corners */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-md" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-md" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-md" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-md" />
                </div>
              </div>
            </div>

            {/* Zoom Slider Control */}
            <div className="w-full px-2 mb-5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[12px] font-bold text-slate-400">
                <span>Yakınlaştır / Uzaklaştır</span>
                <span className="text-primary font-extrabold">% {Math.round(scale * 100)}</span>
              </div>
              <input 
                type="range" 
                min="0.8" 
                max="3" 
                step="0.05" 
                value={scale} 
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Rotation Control Toolbar */}
            <div className="flex justify-center gap-4 w-full mb-6">
              <button 
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                className="py-2 px-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:border-primary hover:text-primary transition-all hover:scale-[1.03]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Sola Döndür
              </button>
              
              <button 
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="py-2 px-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:border-primary hover:text-primary transition-all hover:scale-[1.03]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38L2.5 8"/></svg>
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
            <h2 className="text-[24px] font-extrabold text-slate-800 mb-3">Belge bulunamadı</h2>
            <p className="text-slate-600 font-medium mb-8 px-2">
              Kamerayı belgeye doğru tuttuğunuzdan emin olun.
            </p>
            
            <button 
              onClick={() => setStep("ready")}
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 mb-3 transition-all active:scale-95"
            >
              Tekrar Tara
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
              {onResult ? (
                <button 
                  onClick={() => {
                    onResult(parsedData);
                  }}
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 mb-3"
                >
                  <Check className="w-5 h-5" />
                  Forma Aktar
                </button>
              ) : (
                <button 
                  onClick={handleConfirm}
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 mb-3"
                >
                  <Check className="w-5 h-5" />
                  Bilgileri Kaydet
                </button>
              )}
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
