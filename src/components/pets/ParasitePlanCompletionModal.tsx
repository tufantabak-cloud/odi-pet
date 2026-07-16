'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ParasitePlanCompletionModalProps {
  planId: string;
  petId: string;
  onClose: () => void;
  onSuccess: (notes?: string) => void;
}

interface CompletionContext {
  plan_id: string;
  category: string;
  protocol_name: string;
  allowed_application_methods: string[];
  default_application_method: string;
  default_protection_duration_days: number;
}

const METHOD_LABELS: Record<string, string> = {
  spot_on: 'Damla',
  oral: 'Ağızdan / Tablet',
  collar: 'Tasma',
  injection: 'Enjeksiyon',
  spray: 'Sprey',
  shampoo: 'Şampuan',
  other: 'Diğer',
};

// Cihaz/tarayıcı yerel saatine göre tarih string'i üreten güvenli yardımcı
function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Boş veya sadece boşluk içeren stringleri null'a çeviren güvenli yardımcı
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function ParasitePlanCompletionModal({
  planId,
  petId,
  onClose,
  onSuccess,
}: ParasitePlanCompletionModalProps) {
  const router = useRouter();
  const [context, setContext] = useState<CompletionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isSubmittingRef = useRef(false);

  // Form States
  const [administeredAt, setAdministeredAt] = useState(getLocalDateString());
  const [applicationMethod, setApplicationMethod] = useState('');
  const [protectionDuration, setProtectionDuration] = useState('');
  const [brand, setBrand] = useState('');
  const [productName, setProductName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const todayStr = getLocalDateString();

  // Load completion context from secure GET endpoint
  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch(`/api/plans/${planId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'PROTOCOL_NOT_FOUND');
        }
        const data: CompletionContext = await res.json();
        setContext(data);
        
        // Set default values
        setProtectionDuration(String(data.default_protection_duration_days || 30));
        if (data.allowed_application_methods?.length === 1) {
          setApplicationMethod(data.allowed_application_methods[0]);
        } else {
          setApplicationMethod(data.default_application_method || '');
        }
      } catch (err: any) {
        console.error('[ParasiteModal] Context load error:', err);
        setError(err.message === 'FORBIDDEN' ? 'Bu işlemi gerçekleştirmek için yetkiniz yok.' : 'Planın parazit protokolü bulunamadı.');
      } finally {
        setLoading(false);
      }
    }
    loadContext();
  }, [planId]);

  // Clean up helper to remove an uploaded file
  async function cleanupUploadedFile(filePath: string) {
    try {
      const cleanupRes = await fetch('/api/upload/pet-documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, pet_id: petId }),
      });
      if (!cleanupRes.ok) {
        const cleanupErr = await cleanupRes.json().catch(() => ({}));
        console.error('[ParasiteModal] Secure cleanup failed:', cleanupErr);
      }
    } catch (deleteErr) {
      console.error('[ParasiteModal] Exception during file cleanup:', deleteErr);
    }
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current || saving) return;

    // Client-side validations
    if (!administeredAt) {
      setError('Uygulama tarihi seçilmelidir.');
      return;
    }
    if (administeredAt > todayStr) {
      setError('Uygulama tarihi gelecek bir tarih olamaz.');
      return;
    }
    if (!applicationMethod) {
      setError('Uygulama yöntemi seçilmelidir.');
      return;
    }
    const durationNum = Number(protectionDuration);
    if (isNaN(durationNum) || durationNum <= 0 || !Number.isInteger(durationNum)) {
      setError('Koruma süresi pozitif bir tam sayı olmalıdır.');
      return;
    }

    isSubmittingRef.current = true;
    setSaving(true);
    setError('');
    let uploadedPath: string | null = null;

    try {
      // 1. Upload file if selected
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await fetch('/api/upload/pet-documents', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadErrData = await uploadRes.json().catch(() => ({}));
          throw new Error(uploadErrData.error || 'Dosya yüklenemedi.');
        }

        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.path) {
          throw new Error(uploadData.error || 'Dosya yüklenemedi.');
        }

        uploadedPath = uploadData.path;
        setIsUploading(false);
      }

      // 2. Call PATCH completion endpoint
      const payload = {
        administered_at: administeredAt,
        application_method: applicationMethod,
        brand_free_text: emptyToNull(brand),
        product_free_text: emptyToNull(productName),
        protection_duration_days: durationNum,
        notes: emptyToNull(notes),
        document_storage_path: uploadedPath ?? null,
      };

      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      const isValidSuccess = 
        res.ok === true &&
        data?.plan?.status === 'completed' &&
        typeof data?.plan?.record_id === 'string' &&
        typeof data?.plan?.idempotent === 'boolean';

      if (!isValidSuccess) {
        // Cleanup the uploaded file because the plan PATCH failed or returned invalid response shape
        if (uploadedPath) {
          try {
            await cleanupUploadedFile(uploadedPath);
          } catch (cleanupErr) {
            console.error('Cleanup failed after invalid success shape:', cleanupErr);
          }
        }
        
        const errorKey = data && typeof data.error === 'string' ? data.error : 'PLAN_COMPLETION_FAILED';
        let mappedMsg = 'Kayıt tamamlanamadı. Lütfen tekrar deneyin.';

        if (errorKey === 'INVALID_APPLICATION_DATA') {
          mappedMsg = 'Uygulama bilgilerini kontrol edin.';
        } else if (errorKey === 'INVALID_APPLICATION_METHOD') {
          mappedMsg = 'Bu uygulama yöntemi seçilen protokole uygun değil.';
        } else if (errorKey === 'PLAN_CANCELLED') {
          mappedMsg = 'İptal edilmiş plan tamamlanamaz.';
        } else if (errorKey === 'NOT_PARASITE_PLAN') {
          mappedMsg = 'Bu işlem yalnızca parazit planları için kullanılabilir.';
        } else if (errorKey === 'PROTOCOL_NOT_FOUND') {
          mappedMsg = 'Planın parazit protokolü bulunamadı.';
        } else if (errorKey === 'PLAN_COMPLETION_FAILED') {
          mappedMsg = 'Kayıt tamamlanamadı. Lütfen tekrar deneyin.';
        }
        throw new Error(mappedMsg);
      }

      // 3. Verify path link correctness for file uploads
      const completedPlan = data.plan;
      const isIdempotent = completedPlan.idempotent === true;

      if (uploadedPath) {
        if (!isIdempotent) {
          // New completion: response path MUST match uploaded path
          if (completedPlan.document_storage_path !== uploadedPath) {
            try {
              await cleanupUploadedFile(uploadedPath);
            } catch (cleanupErr) {
              console.error('Cleanup failed on path mismatch:', cleanupErr);
            }
            throw new Error('PLAN_COMPLETION_FAILED');
          }
        } else {
          // Idempotent completion: if new path is different, delete the newly uploaded temp file
          if (completedPlan.document_storage_path !== uploadedPath) {
            try {
              await cleanupUploadedFile(uploadedPath);
            } catch (cleanupErr) {
              console.error('Cleanup of unused idempotent file failed:', cleanupErr);
            }
          }
        }
      }

      // Successful completion
      setToastMessage('Parazit uygulaması kaydedildi.');
      setTimeout(() => {
        onSuccess(brand || notes);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Kayıt tamamlanamadı. Lütfen tekrar deneyin.');
      setSaving(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-modal p-6 shadow-2xl overflow-y-auto max-h-[90vh] animate-fade-in" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-extrabold text-text-primary">Parazit Uygulaması Kaydı</h3>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[12px] font-bold text-text-secondary">Protokol detayları yükleniyor...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
            {context && (
              <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 mb-1">
                <p className="text-[12px] font-black text-primary uppercase tracking-wide">Aktif Protokol</p>
                <p className="text-[14px] font-bold text-text-primary mt-0.5">{context.protocol_name}</p>
              </div>
            )}

            {/* Administered At (Uygulama Tarihi) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Uygulama Tarihi</label>
              <input
                type="date"
                max={todayStr}
                value={administeredAt}
                onChange={e => setAdministeredAt(e.target.value)}
                className="input-base py-3 text-[14px]"
                required
              />
            </div>

            {/* Application Method (Uygulama Yöntemi) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Uygulama Yöntemi</label>
              <select
                value={applicationMethod}
                onChange={e => setApplicationMethod(e.target.value)}
                className="input-base py-3 text-[14px]"
                required
              >
                <option value="">Seçiniz</option>
                {context?.allowed_application_methods?.map((m: string) => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m] || m}
                  </option>
                ))}
              </select>
            </div>

            {/* Protection Duration (Koruma Süresi) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Koruma Süresi (gün)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={protectionDuration}
                onChange={e => setProtectionDuration(e.target.value)}
                className="input-base py-3 text-[14px]"
                required
              />
            </div>

            {/* Brand (Marka) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Marka (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Nexgard, Broadline"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="input-base py-3 text-[14px]"
              />
            </div>

            {/* Product Name (Ürün Adı) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Ürün Adı (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Combo Dog L"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="input-base py-3 text-[14px]"
              />
            </div>

            {/* Notes (Notlar) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Not (Opsiyonel)</label>
              <textarea
                placeholder="Uygulamaya dair notlar ekleyin..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="input-base py-2.5 text-[14px] resize-none"
              />
            </div>

            {/* File Upload (Dosya/Fotoğraf) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Belge veya Fotoğraf (Opsiyonel)</label>
              
              {!selectedFile ? (
                <div className="border-2 border-dashed border-border-main rounded-xl p-4 text-center hover:bg-bg-main/40 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setSelectedFile(file);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-secondary">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    <span className="text-[12px] font-bold text-text-primary">Dosya Seçin</span>
                    <span className="text-[10px] text-text-secondary">Görsel veya PDF (Maks. 5MB)</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-bg-main/60 border border-border-main p-3 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary shrink-0">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-[12px] font-bold text-text-primary truncate">{selectedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-error hover:text-error-hover text-[11px] font-extrabold px-2.5 py-1 hover:bg-error/5 rounded-lg shrink-0 transition-colors"
                  >
                    Kaldır
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-[12px] text-error font-bold p-2.5 bg-error/10 border border-error/20 rounded-xl text-center mt-1 leading-snug animate-shake">
                {error}
              </div>
            )}

            {/* Toast Message */}
            {toastMessage && (
              <div className="text-[12px] text-green-700 font-bold p-2.5 bg-green-50 border border-green-200 rounded-xl text-center mt-1 leading-snug">
                {toastMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-3 rounded-btn border-2 border-border-main text-text-secondary font-bold text-[13px] disabled:opacity-50 transition-all"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] btn-primary py-3 disabled:opacity-50 shadow-md shadow-primary/10 text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {saving ? (
                  <>
                    <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <span>Uygulamayı Kaydet</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
