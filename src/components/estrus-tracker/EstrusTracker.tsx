'use client';

import { useState } from 'react';
import { useEstrusTracker, EstrusCycle } from './useEstrusTracker';

export function EstrusTracker({ petId, petSpecies }: { petId: string, petSpecies: string }) {
  const { cycles, loading, addCycle, deleteCycle } = useEstrusTracker(petId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const availableSymptoms = petSpecies === 'Köpek' 
    ? ['Kanama', 'Şişlik', 'Huzursuzluk', 'Sık İdrara Çıkma', 'İştahsızlık']
    : ['Aşırı Miyavlama', 'Sürtünme', 'Yerde Yuvarlanma', 'Huzursuzluk', 'İştahsızlık', 'Kuyruk Kaldırma'];

  const handleToggleSymptom = (sym: string) => {
    if (symptoms.includes(sym)) {
      setSymptoms(symptoms.filter(s => s !== sym));
    } else {
      setSymptoms([...symptoms, sym]);
    }
  };

  const handleSave = async () => {
    if (!startDate) return;
    setSubmitting(true);
    try {
      await addCycle({
        start_date: startDate,
        end_date: endDate || null,
        notes,
        symptoms,
      });
      setIsModalOpen(false);
      setStartDate('');
      setEndDate('');
      setNotes('');
      setSymptoms([]);
    } catch (err) {
      console.error(err);
      alert('Kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    setIsDeleting(id);
    try {
      await deleteCycle(id);
    } catch (err) {
      console.error(err);
      alert('Silinemedi.');
    } finally {
      setIsDeleting(null);
    }
  };

  // Calculations
  const latestCycle = cycles.length > 0 ? cycles[0] : null;
  let nextCycleDate: Date | null = null;
  let daysUntilNext = 0;
  
  if (latestCycle && petSpecies === 'Köpek') {
    const start = new Date(latestCycle.start_date);
    nextCycleDate = new Date(start);
    nextCycleDate.setMonth(nextCycleDate.getMonth() + 6);
    
    const now = new Date();
    const diffTime = nextCycleDate.getTime() - now.getTime();
    daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className={`card-base p-6 mt-6 ${isModalOpen ? 'relative z-50' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-pink-100 flex items-center justify-center text-pink-500 shadow-inner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-[16px] font-black text-text-primary">Kızgınlık ve Döngü</h3>
            <p className="text-[12px] font-medium text-text-secondary">Üreme sağlığı takibi</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary py-2 px-4 text-[13px] h-10 rounded-[12px]"
        >
          + Yeni Dönem
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : cycles.length === 0 ? (
        <div className="py-6 flex flex-col items-center justify-center text-center bg-bg-main rounded-2xl border border-dashed border-border-main">
          <span className="text-[32px] mb-2 opacity-50">🌸</span>
          <p className="text-[13px] font-bold text-text-primary mb-1">Henüz hiç kayıt yok</p>
          <p className="text-[12px] font-medium text-text-secondary max-w-[250px]">
            {petSpecies === 'Köpek' 
              ? 'Köpeğinizin ilk kızgınlık dönemini buradan kaydedebilirsiniz.' 
              : 'Kedinizin kızgınlık belirtilerini takip etmek için yeni kayıt oluşturun.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* Beklenen Sonraki Döngü - Sadece Köpekler için */}
          {nextCycleDate && petSpecies === 'Köpek' && (
            <div className={`p-4 rounded-[16px] border ${daysUntilNext <= 14 && daysUntilNext > 0 ? 'bg-orange-50 border-orange-200' : daysUntilNext <= 0 ? 'bg-pink-50 border-pink-200' : 'bg-primary-soft/20 border-primary/20'}`}>
              <div className="flex items-center gap-3">
                <span className="text-[24px]">
                  {daysUntilNext <= 0 ? '🚨' : daysUntilNext <= 14 ? '⚠️' : '📅'}
                </span>
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-text-secondary">Beklenen Sonraki Dönem</p>
                  <p className="text-[14px] font-black text-text-primary">
                    {formatDate(nextCycleDate.toISOString())}
                  </p>
                </div>
                {daysUntilNext > 0 ? (
                  <div className="px-3 py-1.5 rounded-full bg-white/60 text-[12px] font-bold text-text-primary shadow-sm border border-black/5">
                    {daysUntilNext} gün kaldı
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-full bg-white/60 text-[12px] font-bold text-pink-600 shadow-sm border border-pink-200">
                    Dönem geldi/geçiyor
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kediler için genel bilgi */}
          {petSpecies === 'Kedi' && (
            <div className="p-4 rounded-[16px] border bg-indigo-50 border-indigo-100 flex gap-3 items-start">
              <span className="text-[20px] mt-0.5">ℹ️</span>
              <div>
                <p className="text-[13px] font-bold text-indigo-900">Kedilerde Kızgınlık Döngüsü</p>
                <p className="text-[12px] font-medium text-indigo-700/80 mt-0.5">
                  Kediler mevsimsel poliestrik canlılardır. Genellikle ilkbahardan sonbahara kadar, her 2-3 haftada bir kızgınlık gösterebilirler. Kesin tarih tahmini zordur.
                </p>
              </div>
            </div>
          )}

          {/* Geçmiş Kayıtlar */}
          <div className="flex flex-col gap-3 mt-2">
            <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-wider mb-1">Döngü Geçmişi</h4>
            {cycles.map(cycle => (
              <div key={cycle.id} className="p-4 rounded-[16px] bg-white border border-border-main flex flex-col gap-3 transition-all hover:border-primary/30">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[14px] font-black text-text-primary">
                      {formatDate(cycle.start_date)}
                      {cycle.end_date && <span className="text-text-secondary font-medium text-[13px]"> - {formatDate(cycle.end_date)}</span>}
                    </p>
                    {cycle.notes && <p className="text-[12px] text-text-secondary mt-1">{cycle.notes}</p>}
                  </div>
                  <button 
                    onClick={() => handleDelete(cycle.id)}
                    disabled={isDeleting === cycle.id}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-error/60 hover:text-error hover:bg-error/10 transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                
                {cycle.symptoms && Array.isArray(cycle.symptoms) && cycle.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(cycle.symptoms as string[]).map(sym => (
                      <span key={sym} className="px-2.5 py-1 rounded-full bg-bg-main text-[11px] font-bold text-text-secondary border border-border-main">
                        {sym}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-[24px] shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border-main flex justify-between items-center bg-surface">
              <h3 className="text-[16px] font-black text-text-primary">Yeni Dönem Kaydet</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-text-primary">Başlangıç Tarihi *</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    max={new Date().toISOString().split('T')[0]}
                    className="input-base"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-text-primary">Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    max={new Date().toISOString().split('T')[0]}
                    className="input-base"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Gözlemlenen Belirtiler</label>
                <div className="flex flex-wrap gap-2">
                  {availableSymptoms.map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleToggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all border ${symptoms.includes(sym) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-text-secondary border-border-main hover:border-primary/40'}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Notlar</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="input-base min-h-[80px] resize-none"
                  placeholder="Eklemek istediğiniz notlar..."
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-main bg-surface flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-[12px] text-[14px] font-bold text-text-secondary hover:bg-bg-main transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={handleSave}
                disabled={!startDate || submitting}
                className="btn-primary px-6 py-2.5 rounded-[12px] text-[14px] disabled:opacity-50"
              >
                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
