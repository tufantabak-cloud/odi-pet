'use client';
import { useState, useEffect } from 'react';

const DOG_SYMPTOMS = [
  { code: 'BLEEDING', label: 'Kanama' },
  { code: 'VULVAR_SWELLING', label: 'Vulva Şişliği' },
  { code: 'RESTLESSNESS', label: 'Huzursuzluk' },
  { code: 'FREQUENT_URINATION', label: 'Sık İdrara Çıkma' },
  { code: 'APPETITE_CHANGE', label: 'İştah Değişimi' },
  { code: 'TAIL_POSITION', label: 'Kuyruk Pozisyonu Değişimi' },
  { code: 'MALE_ACCEPTANCE', label: 'Erkeğe yakınlaşmayı kabul etme davranışı' },
  { code: 'OTHER', label: 'Diğer' }
];

const CAT_SYMPTOMS = [
  { code: 'VOCALIZATION', label: 'Aşırı Miyavlama' },
  { code: 'RUBBING', label: 'Sürtünme' },
  { code: 'ROLLING', label: 'Yerde Yuvarlanma' },
  { code: 'RESTLESSNESS', label: 'Huzursuzluk' },
  { code: 'APPETITE_CHANGE', label: 'İştah Değişimi' },
  { code: 'TAIL_POSITION', label: 'Kuyruk Kaldırma' },
  { code: 'MALE_ACCEPTANCE', label: 'Erkeğe yakınlaşmayı kabul etme davranışı' },
  { code: 'OTHER', label: 'Diğer' }
];

export function EstrusObservationForm({ 
  petSpecies, 
  cycleStartDate, 
  cycleEndDate, 
  onSave, 
  onCancel,
  initialData
}: { 
  petSpecies: string, 
  cycleStartDate: string, 
  cycleEndDate: string | null, 
  onSave: (data: any) => Promise<void>, 
  onCancel: () => void,
  initialData?: any
}) {
  const [date, setDate] = useState(initialData?.observation_date || new Date().toISOString().split('T')[0]);
  const [code, setCode] = useState(initialData?.symptom_code || '');
  const [severity, setSeverity] = useState<number>(initialData?.severity || 2);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const symptoms = petSpecies === 'Köpek' ? DOG_SYMPTOMS : CAT_SYMPTOMS;
  
  // Date limits
  const today = new Date().toISOString().split('T')[0];
  const maxDate = cycleEndDate ? (cycleEndDate < today ? cycleEndDate : today) : today;

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!date || !code || !severity) return;
    
    // Frontend Date check
    if (date < cycleStartDate) {
      setErrorMsg('Tarih, kızgınlık döneminin sınırları içinde olmalıdır.');
      return;
    }
    if (cycleEndDate && date > cycleEndDate) {
      setErrorMsg('Tarih, kızgınlık döneminin sınırları içinde olmalıdır.');
      return;
    }
    if (date > today) {
      setErrorMsg('Tarih gelecekte olamaz.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({ observation_date: date, symptom_code: code, severity, notes });
      // Don't clear or close here, parent handles it
    } catch (err: any) {
      if (err.message?.includes('ALREADY_EXISTS') || err.message?.includes('DUPLICATE')) {
        setErrorMsg('Bu belirti aynı gün için zaten kaydedilmiş.');
      } else if (err.message?.includes('FORBIDDEN') || err.message?.includes('Unauthorized')) {
        setErrorMsg('Bu kayıt üzerinde işlem yetkiniz bulunmuyor.');
      } else if (err.message?.includes('Tarih')) {
        setErrorMsg('Tarih, kızgınlık döneminin sınırları içinde olmalıdır.');
      } else {
        setErrorMsg('Kayıt işlemi tamamlanamadı. Tekrar deneyin.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {errorMsg && (
        <div className="p-3 bg-error/10 border border-error/20 text-error rounded-xl text-[13px] font-bold">
          {errorMsg}
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-text-primary">Gözlem Tarihi</label>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
          min={cycleStartDate}
          max={maxDate}
          className="input-base w-full"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-text-primary">Belirti</label>
        <select 
          value={code} 
          onChange={e => setCode(e.target.value)} 
          className="input-base w-full bg-white"
        >
          <option value="" disabled>Belirti seçin</option>
          {symptoms.map(s => (
            <option key={s.code} value={s.code}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-text-primary">Şiddet</label>
        <div className="flex gap-2">
          {[1, 2, 3].map(level => (
            <button
              key={level}
              type="button"
              onClick={() => setSeverity(level)}
              className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all border ${severity === level ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-text-secondary border-border-main hover:border-primary/40'}`}
            >
              {level === 1 ? '1 - Hafif' : level === 2 ? '2 - Orta' : '3 - Belirgin'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-text-primary">Not (Opsiyonel)</label>
        <textarea 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          className="input-base min-h-[80px] resize-none w-full"
          placeholder="Eklemek istediğiniz detaylar..."
        ></textarea>
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
          disabled={!date || !code || !severity || submitting}
          className="btn-primary px-6 py-2.5 rounded-input text-[14px] disabled:opacity-50"
        >
          {submitting ? 'Kaydediliyor...' : (initialData ? 'Değişiklikleri Kaydet' : 'Kaydet')}
        </button>
      </div>
    </div>
  );
}

export function getSymptomLabel(code: string, petSpecies: string) {
  const symptoms = petSpecies === 'Köpek' ? DOG_SYMPTOMS : CAT_SYMPTOMS;
  const match = symptoms.find(s => s.code === code);
  return match ? match.label : code;
}
