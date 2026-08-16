'use client';

import React, { useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import AiReviewModal from './AiReviewModal';

interface AiDocumentScannerProps {
  petId: string;
  onConfirm: (data: any) => void;
}

export default function AiDocumentScanner({ petId, onConfirm }: AiDocumentScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // 1. Upload to bucket
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch(`/api/pets/${petId}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { path } = await uploadRes.json();

      // 2. Call OCR Mock
      const ocrRes = await fetch(`/api/pets/${petId}/documents/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      
      if (!ocrRes.ok) throw new Error('OCR failed');
      const result = await ocrRes.json();
      
      setOcrResult(result);
    } catch (error) {
      console.error('Error during OCR process:', error);
      alert('Belge tarama sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 min-h-12 rounded-btn border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors text-purple-700 font-bold text-sm relative overflow-hidden group shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 size={18} className="animate-spin text-purple-600" />
            <span>Yapay Zeka belgenizi okuyor...</span>
          </>
        ) : (
          <>
            <Sparkles size={18} className="text-purple-600 group-hover:scale-110 transition-transform" />
            <span>AI ile Belge Oku</span>
          </>
        )}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {ocrResult && (
        <AiReviewModal
          result={ocrResult}
          onConfirm={(data) => {
            setOcrResult(null);
            onConfirm(data);
          }}
          onCancel={() => setOcrResult(null)}
        />
      )}
    </>
  );
}
