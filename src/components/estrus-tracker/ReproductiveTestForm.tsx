'use client';
import { useState, useRef } from 'react';

export function ReproductiveTestForm({ 
  cycleStartDate, 
  cycleEndDate, 
  onSave, 
  onCancel,
  initialData
}: { 
  cycleStartDate: string, 
  cycleEndDate: string | null, 
  onSave: (data: any) => Promise<void>, 
  onCancel: () => void,
  initialData?: any
}) {
  const [testType, setTestType] = useState(initialData?.test_type || 'progesterone');
  
  // Create a default date-time string in local timezone format (YYYY-MM-DDTHH:mm)
  const getNowStr = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  
  const [sampledAt, setSampledAt] = useState(initialData ? new Date(initialData.sampled_at).toISOString().slice(0,16) : getNowStr());
  
  const [progValue, setProgValue] = useState<string>(initialData?.progesterone_value?.toString() || '');
  const [progUnit, setProgUnit] = useState(initialData?.progesterone_unit || 'ng/mL');
  
  const [cytoPercent, setCytoPercent] = useState<string>(initialData?.cytology_superficial_percent?.toString() || '');
  const [cytoResult, setCytoResult] = useState(initialData?.cytology_result || '');

  const [vetName, setVetName] = useState(initialData?.veterinarian_name || '');
  const [clinicName, setClinicName] = useState(initialData?.clinic_name || '');
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = getNowStr();
  const maxDate = cycleEndDate ? new Date(cycleEndDate + 'T23:59:59').toISOString().slice(0,16) : todayStr;
  const minDate = new Date(cycleStartDate + 'T00:00:00').toISOString().slice(0,16);

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!testType || !sampledAt) return;
    
    if (sampledAt < minDate) {
      setErrorMsg('Tarih, kızgınlık döneminin sınırları içinde olmalıdır.');
      return;
    }
    if (cycleEndDate && sampledAt > maxDate) {
      setErrorMsg('Tarih, kızgınlık döneminin sınırları içinde olmalıdır.');
      return;
    }
    if (sampledAt > todayStr) {
      setErrorMsg('Tarih gelecekte olamaz.');
      return;
    }

    if (testType === 'progesterone' && (!progValue || parseFloat(progValue) < 0)) {
      setErrorMsg('Geçerli bir progesteron değeri giriniz.');
      return;
    }
    
    if (testType === 'vaginal_cytology') {
      if (!cytoResult && !cytoPercent) {
        setErrorMsg('Sitoloji sonucu veya yüzdesi gereklidir.');
        return;
      }
      if (cytoPercent && (parseFloat(cytoPercent) < 0 || parseFloat(cytoPercent) > 100)) {
        setErrorMsg('Sitoloji yüzdesi 0-100 arasında olmalıdır.');
        return;
      }
    }

    setSubmitting(true);
    try {
      let documentPath = initialData?.document_storage_path || null;
      
      // Upload file if selected
      if (file) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload/pet-documents', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Dosya yüklenemedi.');
        }
        documentPath = uploadData.path;
        setUploading(false);
      }

      const payload: any = {
        test_type: testType,
        sampled_at: new Date(sampledAt).toISOString(),
        veterinarian_name: vetName,
        clinic_name: clinicName,
        document_storage_path: documentPath
      };

      if (testType === 'progesterone') {
        payload.progesterone_value = parseFloat(progValue);
        payload.progesterone_unit = progUnit;
      } else {
        if (cytoPercent) payload.cytology_superficial_percent = parseFloat(cytoPercent);
        if (cytoResult) payload.cytology_result = cytoResult;
      }

      await onSave(payload);
    } catch (err: any) {
      if (err.message?.includes('ALREADY_EXISTS') || err.message?.includes('DUPLICATE')) {
        setErrorMsg('Bu belirti aynı gün için zaten kaydedilmiş.');
      } else if (err.message?.includes('FORBIDDEN') || err.message?.includes('Unauthorized')) {
        setErrorMsg('Bu kayıt üzerinde işlem yetkiniz bulunmuyor.');
      } else if (err.message?.includes('Tarih') || err.message?.includes('tarih')) {
        setErrorMsg('Tarih, kızgınlık döneminin sınırları içinde olmalıdır.');
      } else {
        setErrorMsg(err.message || 'Kayıt işlemi tamamlanamadı. Tekrar deneyin.');
      }
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {errorMsg && (
        <div className="p-3 bg-error/10 border border-error/20 text-error rounded-xl text-[13px] font-bold">
          {errorMsg}
        </div>
      )}
      
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
        <p className="text-[12px] font-medium text-indigo-900 leading-tight">
          Test sonuçları yalnızca kayıt ve takip amacıyla gösterilir. Tek bir test sonucu kesin ovulasyon veya çiftleşme zamanı anlamına gelmez.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-text-primary">Test Türü</label>
        <select 
          value={testType} 
          onChange={e => setTestType(e.target.value)} 
          className="input-base w-full bg-white"
          disabled={!!initialData}
        >
          <option value="progesterone">Progesteron Testi</option>
          <option value="vaginal_cytology">Vajinal Sitoloji</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-text-primary">Numune Tarihi ve Saati *</label>
        <input 
          type="datetime-local" 
          value={sampledAt} 
          onChange={e => setSampledAt(e.target.value)} 
          min={minDate}
          max={maxDate}
          className="input-base w-full"
        />
      </div>

      {testType === 'progesterone' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-text-primary">Değer *</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              value={progValue} 
              onChange={e => setProgValue(e.target.value)} 
              className="input-base w-full"
              placeholder="Örn: 2.5"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-text-primary">Birim *</label>
            <select 
              value={progUnit} 
              onChange={e => setProgUnit(e.target.value)} 
              className="input-base w-full bg-white"
            >
              <option value="ng/mL">ng/mL</option>
              <option value="nmol/L">nmol/L</option>
            </select>
          </div>
        </div>
      )}

      {testType === 'vaginal_cytology' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-text-primary">Yüzeysel Hücre Oranı (%)</label>
            <input 
              type="number" 
              step="1"
              min="0"
              max="100"
              value={cytoPercent} 
              onChange={e => setCytoPercent(e.target.value)} 
              className="input-base w-full"
              placeholder="Örn: 80"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-text-primary">Sonuç Açıklaması {cytoPercent ? '(Opsiyonel)' : '*'}</label>
            <textarea 
              value={cytoResult} 
              onChange={e => setCytoResult(e.target.value)} 
              className="input-base min-h-[60px] resize-none w-full"
              placeholder="Örn: Tam kornifikasyon gözlendi..."
            ></textarea>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-text-primary">Veteriner Adı (Opsiyonel)</label>
          <input 
            type="text" 
            value={vetName} 
            onChange={e => setVetName(e.target.value)} 
            className="input-base w-full"
            placeholder="İsim..."
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-text-primary">Klinik Adı (Opsiyonel)</label>
          <input 
            type="text" 
            value={clinicName} 
            onChange={e => setClinicName(e.target.value)} 
            className="input-base w-full"
            placeholder="Klinik..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-text-primary">
          {initialData?.document_storage_path ? 'Yeni Belge Yükle (Mevcut belgeyi değiştirir)' : 'Belge / Sonuç Raporu (Opsiyonel)'}
        </label>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={e => setFile(e.target.files?.[0] || null)}
          accept="image/*,.pdf"
          className="text-[12px] text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[12px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
        />
        <p className="text-[11px] text-text-secondary mt-1">Maksimum 5MB. Resim veya PDF.</p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button 
          onClick={onCancel}
          className="px-5 py-2.5 rounded-input text-[14px] font-bold text-text-secondary hover:bg-bg-main transition-colors"
        >
          İptal
        </button>
        <button 
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="btn-primary px-6 py-2.5 rounded-input text-[14px] disabled:opacity-50"
        >
          {uploading ? 'Belge Yükleniyor...' : submitting ? 'Kaydediliyor...' : (initialData ? 'Değişiklikleri Kaydet' : 'Kaydet')}
        </button>
      </div>
    </div>
  );
}
