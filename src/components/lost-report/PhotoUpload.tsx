'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, CheckCircle2, Image as ImageIcon, RotateCcw, Plus, X } from 'lucide-react';

interface PhotoUploadProps {
  sessionId: string;
  defaultPhotoUrl?: string | null;
  petName?: string;
  onNext: (data: any) => void;
}

interface AdditionalPhotoItem {
  id: string;
  file: File;
  preview: string;
}

export const PhotoUpload = ({
  sessionId,
  defaultPhotoUrl,
  petName,
  onNext,
}: PhotoUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [useDefaultPhoto, setUseDefaultPhoto] = useState<boolean>(!!defaultPhotoUrl);
  const [additionalPhotos, setAdditionalPhotos] = useState<AdditionalPhotoItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'INVALID_PHOTO_FILE':
        return 'Lütfen geçerli bir görsel seçin (Max 5MB).';
      case 'PHOTO_UPLOAD_FAILED':
        return 'Fotoğraf yüklenemedi. Lütfen tekrar deneyin veya Fotoğrafsız devam et seçeneğini kullanın.';
      default:
        return 'Yükleme başarısız. Lütfen tekrar deneyin.';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('Ana fotoğraf boyutu en fazla 5MB olabilir.');
        return;
      }
      setFile(selected);
      setFilePreview(URL.createObjectURL(selected));
      setUseDefaultPhoto(false);
      setError('');
    }
  };

  const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('Ek fotoğraf boyutu en fazla 5MB olabilir.');
        return;
      }
      if (additionalPhotos.length >= 2) {
        setError('En fazla 2 adet ek fotoğraf ekleyebilirsiniz.');
        return;
      }
      const newItem: AdditionalPhotoItem = {
        id: crypto.randomUUID(),
        file: selected,
        preview: URL.createObjectURL(selected),
      };
      setAdditionalPhotos((prev) => [...prev, newItem]);
      setError('');
    }
    if (additionalInputRef.current) additionalInputRef.current.value = '';
  };

  const handleRemoveAdditionalPhoto = (id: string) => {
    setAdditionalPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleRevertToDefault = () => {
    setFile(null);
    setFilePreview(null);
    setUseDefaultPhoto(true);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadOrContinue = async () => {
    setError('');

    // Case 1: No photo selected and no default
    if (!file && (!useDefaultPhoto || !defaultPhotoUrl)) {
      setError('Lütfen bir ana fotoğraf seçin veya Fotoğrafsız devam et seçeneğini kullanın.');
      return;
    }

    setLoading(true);
    try {
      let primaryPhotoUrl = '';

      if (useDefaultPhoto && defaultPhotoUrl) {
        primaryPhotoUrl = defaultPhotoUrl;
      } else if (file) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('sessionId', sessionId);

        const res = await fetch('/api/v1/reports/lost/photo', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data.skipped) {
            onNext({ skipped: true });
            return;
          }
          setError(getErrorMessage(data.error));
          setLoading(false);
          return;
        }
        primaryPhotoUrl = data.photoUrl;
      }

      // Upload additional photos if any
      const uploadedAdditionalUrls: string[] = [];
      for (const item of additionalPhotos) {
        const formData = new FormData();
        formData.append('photo', item.file);
        formData.append('sessionId', sessionId);

        const res = await fetch('/api/v1/reports/lost/photo', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.success && data.photoUrl) {
          uploadedAdditionalUrls.push(data.photoUrl);
        }
      }

      onNext({
        photoUrl: primaryPhotoUrl,
        additionalPhotos: uploadedAdditionalUrls,
      });
    } catch (err) {
      setError('Bir bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Fotoğraf Yükle</h2>
        <p className="text-sm text-slate-500 mt-1">
          {petName
            ? `${petName} için kayıp ilanında kullanılacak fotoğrafları seçin (1 ana + 2 ek fotoğraf).`
            : 'Kayıp evcil hayvanınızın fotoğraflarını seçin (1 ana + 2 ek fotoğraf).'}
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <input
        type="file"
        ref={additionalInputRef}
        accept="image/*"
        onChange={handleAdditionalFileChange}
        className="hidden"
      />

      {/* Ana Fotoğraf Alanı */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-700">
          Ana Fotoğraf <span className="text-purple-600">*</span>
        </span>

        {useDefaultPhoto && defaultPhotoUrl ? (
          <div className="flex flex-col items-center gap-3 p-4 bg-purple-50/60 border border-purple-200 rounded-2xl">
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-md border-2 border-purple-500">
              <Image
                src={defaultPhotoUrl}
                alt={petName || 'Profil Fotoğrafı'}
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Varsayılan Profil Fotoğrafı
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-purple-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-all active:scale-[0.98] shadow-sm mt-1"
            >
              <Camera className="w-3.5 h-3.5 text-purple-600" />
              Galeriden Başka Fotoğraf Seç
            </button>
          </div>
        ) : filePreview ? (
          <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-md border-2 border-slate-700">
              <Image
                src={filePreview}
                alt="Yeni Seçilen Fotoğraf"
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Yeni Ana Fotoğraf Seçildi
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all active:scale-[0.98]"
              >
                <Camera className="w-3.5 h-3.5" />
                Değiştir
              </button>
              {defaultPhotoUrl && (
                <button
                  type="button"
                  onClick={handleRevertToDefault}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-100 px-2.5 py-1.5 rounded-xl transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Profil Fotoğrafına Dön
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/50 rounded-2xl cursor-pointer transition-all text-center"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-1">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              Ana Fotoğraf Seçmek İçin Dokunun
            </span>
            <span className="text-xs text-slate-400">PNG, JPG (Max 5MB)</span>
          </div>
        )}
      </div>

      {/* Ek Fotoğraflar Bölümü */}
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">
            Ek Fotoğraflar <span className="text-slate-400 font-normal">(İsteğe bağlı, en fazla 2 adet)</span>
          </label>
          <span className="text-2xs font-semibold text-slate-400">
            {additionalPhotos.length}/2
          </span>
        </div>
        <p className="text-2xs text-slate-500 font-normal">
          Farklı açılar, belirgin lekeler veya tasmayı gösteren fotoğraflar ekleyin.
        </p>

        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {additionalPhotos.map((item, idx) => (
            <div
              key={item.id}
              className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs group"
            >
              <Image
                src={item.preview}
                alt={`Ek Fotoğraf ${idx + 1}`}
                fill
                className="object-cover"
                sizes="96px"
              />
              <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-2xs font-bold px-1.5 py-0.5 rounded-md">
                Ek #{idx + 1}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAdditionalPhoto(item.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-sm transition-all active:scale-[0.98]"
                title="Fotoğrafı Kaldır"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ))}

          {additionalPhotos.length < 2 && (
            <button
              type="button"
              onClick={() => additionalInputRef.current?.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-purple-700 transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 text-purple-600 stroke-[2.5]" />
              <span className="text-2xs font-semibold text-center leading-tight">
                + Ek Fotoğraf<br />Ekle
              </span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-xs font-medium bg-red-50 p-2.5 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <button
        onClick={handleUploadOrContinue}
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 mt-1"
      >
        {loading ? 'Fotoğraflar Yükleniyor...' : 'Devam Et'}
      </button>

      <button
        type="button"
        onClick={() => onNext({ skipped: true })}
        disabled={loading}
        className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-2 rounded-xl transition-all disabled:opacity-50"
      >
        Fotoğrafsız devam et
      </button>
    </div>
  );
};
