'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, CheckCircle2, Image as ImageIcon, RotateCcw } from 'lucide-react';

interface PhotoUploadProps {
  sessionId: string;
  defaultPhotoUrl?: string | null;
  petName?: string;
  onNext: (data: any) => void;
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setFile(selected);
      setFilePreview(URL.createObjectURL(selected));
      setUseDefaultPhoto(false);
      setError('');
    }
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

    // Case 1: Using default profile photo
    if (useDefaultPhoto && defaultPhotoUrl) {
      onNext({ photoUrl: defaultPhotoUrl });
      return;
    }

    // Case 2: New file selected -> upload
    if (file) {
      setLoading(true);
      try {
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
          } else {
            setError(getErrorMessage(data.error));
          }
        } else {
          onNext(data);
        }
      } catch (err) {
        setError('Bir bağlantı hatası oluştu.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Case 3: No photo selected and no default
    setError('Lütfen bir fotoğraf seçin veya Fotoğrafsız devam et seçeneğini kullanın.');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Fotoğraf Yükle</h2>
        <p className="text-sm text-slate-500 mt-1">
          {petName
            ? `${petName} için kayıp ilanında kullanılacak fotoğrafı seçin.`
            : 'Kayıp evcil hayvanınızın fotoğrafını seçin.'}
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Default Pet Photo Selected */}
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
        /* Custom New Photo Selected */
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
            Yeni Fotoğraf Seçildi
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
        /* No Photo Chosen & No Default Photo */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/50 rounded-2xl cursor-pointer transition-all text-center"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-1">
            <ImageIcon className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-slate-700">
            Fotoğraf Seçmek İçin Dokunun
          </span>
          <span className="text-xs text-slate-400">PNG, JPG (Max 5MB)</span>
        </div>
      )}

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
        {loading ? 'Fotoğraf Yükleniyor...' : 'Devam Et'}
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
