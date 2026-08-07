'use client';

import { useState, useEffect } from 'react';
import { useEstrusTracker, EstrusCycle } from './useEstrusTracker';
import { EstrusCycleDetails } from './EstrusCycleDetails';
import { useReproductiveForecast } from './useReproductiveForecast';
import { ReproductiveForecastCard } from './ReproductiveForecastCard';
import { EstrusPreferencesToggle } from './EstrusPreferencesToggle';
import { useFeature } from '@/lib/features/hooks';
import { PremiumContent } from '@/components/premium/PremiumContent';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function EstrusTracker({ petId, petSpecies }: { petId: string, petSpecies: string }) {
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);
    };
    fetchUser();
  }, []);

  const breedingFeature = useFeature({ userId: currentUserId, featureKey: 'breeding_forecast' });

  const { cycles, loading, addCycle, updateCycle, deleteCycle } = useEstrusTracker(petId);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const { forecast, loading: forecastLoading, error: forecastError, refetch: refetchForecast } = useReproductiveForecast(petId);

  // Feature guard - erişim yoksa PremiumContent göster
  if (!breedingFeature.loading && !breedingFeature.enabled) {
    return (
      <div className="mt-4">
        <PremiumContent 
          featureState={breedingFeature}
          featureName="Üreme & Kızgınlık Tahmini"
          onUpgrade={() => { window.location.href = '/owner/profile/subscription'; }}
        />
      </div>
    );
  }

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

  const handleSaveNew = async () => {
    if (!startDate) return;
    setSubmitting(true);
    try {
      await addCycle({
        start_date: startDate,
        end_date: null,
        notes,
        symptoms,
      });
      setIsNewModalOpen(false);
      resetForms();
      refetchForecast();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveHistorical = async () => {
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      await addCycle({
        start_date: startDate,
        end_date: endDate,
        notes,
        symptoms,
      });
      setIsHistoricalModalOpen(false);
      resetForms();
      refetchForecast();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndCycle = async () => {
    if (!activeCycle || !endDate) return;
    setSubmitting(true);
    try {
      await updateCycle(activeCycle.id, {
        end_date: endDate
      });
      setIsEndModalOpen(false);
      resetForms();
      refetchForecast();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Dönem bitirilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    setIsDeleting(id);
    try {
      await deleteCycle(id);
      refetchForecast();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Silinemedi.');
    } finally {
      setIsDeleting(null);
    }
  };

  const resetForms = () => {
    setStartDate('');
    setEndDate('');
    setNotes('');
    setSymptoms([]);
  };

  // Calculations
  const activeCycle = cycles.find(c => c.end_date === null);
  const pastCycles = cycles.filter(c => c.end_date !== null);
  
  let activeCycleDays = 0;
  if (activeCycle) {
    const start = new Date(activeCycle.start_date);
    const now = new Date();
    // bugünden start_date çıkar + 1
    const diffTime = now.getTime() - start.getTime();
    activeCycleDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className={`card-base p-6 mt-6 ${(isNewModalOpen || isHistoricalModalOpen || isEndModalOpen) ? 'relative z-50' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-input bg-pink-100 flex items-center justify-center text-pink-500 shadow-inner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-[16px] font-black text-text-primary">Kızgınlık ve Döngü</h3>
            <p className="text-[12px] font-medium text-text-secondary">Üreme sağlığı takibi</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* Aktif Dönem Kartı */}
          {activeCycle ? (
            <div className="p-4 rounded-card border bg-pink-50 border-pink-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[24px]">🌸</span>
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-pink-700 uppercase tracking-wide">Aktif Kızgınlık Dönemi</p>
                  <p className="text-[14px] font-black text-text-primary">
                    {formatDate(activeCycle.start_date)}'da başladı
                  </p>
                  {forecast?.activeCycle && forecast.activeCycle.state !== 'no_active_cycle' && (
                    <p className="text-[12px] text-pink-800/80 font-medium mt-0.5">
                      {forecast.activeCycle.state === 'active_observation_period' ? 'Belirtiler takip ediliyor' :
                       forecast.activeCycle.state === 'test_supported_monitoring' ? 'Test sonuçlarıyla birlikte takip ediliyor' :
                       forecast.activeCycle.state === 'insufficient_data' ? 'Döngü bilgileri kontrol edilmeli' :
                       'Aktif dönem bulunmuyor'}
                    </p>
                  )}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-white text-[12px] font-bold text-pink-600 shadow-sm border border-pink-100 text-center leading-tight">
                  {forecast?.activeCycle?.cycleDay ? (
                    <>Döngünün <br/> {forecast.activeCycle.cycleDay}. günü</>
                  ) : (
                    <>Döngünün <br/> {activeCycleDays}. günü</>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-pink-100">
                <button onClick={() => {
                  setEndDate(todayStr);
                  setIsEndModalOpen(true);
                }} className="flex-1 min-w-[120px] min-h-[44px] bg-white border border-pink-200 text-pink-600 text-[13px] font-bold rounded-input shadow-sm hover:bg-pink-50 transition-colors flex items-center justify-center">
                  Dönemi Bitir
                </button>
              </div>
              <EstrusCycleDetails 
                petId={petId}
                petSpecies={petSpecies}
                cycleId={activeCycle.id}
                startDate={activeCycle.start_date}
                endDate={activeCycle.end_date}
                legacySymptoms={activeCycle.symptoms as string[]}
                onDataChanged={refetchForecast}
              />
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center bg-bg-main rounded-2xl border border-dashed border-border-main">
              <span className="text-[32px] mb-2 opacity-50">🌸</span>
              <p className="text-[13px] font-bold text-text-primary mb-1">Aktif dönem yok</p>
              <p className="text-[12px] font-medium text-text-secondary max-w-[250px] mb-4">
                Kızgınlık belirtileri gözlemlendiğinde yeni bir dönem başlatabilirsiniz.
              </p>
              <button 
                onClick={() => {
                  resetForms();
                  setStartDate(todayStr);
                  setIsNewModalOpen(true);
                }}
                className="btn-primary py-2 px-6 text-[13px] min-h-[44px] rounded-input shadow-sm flex items-center justify-center"
              >
                Dönemi Başlat
              </button>
            </div>
          )}

          <div className="flex justify-end mt-1">
            <button 
              onClick={() => {
                resetForms();
                setIsHistoricalModalOpen(true);
              }}
              className="text-[12px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-4 min-h-[44px] flex items-center rounded-lg transition-colors border border-violet-100"
            >
              + Geçmiş Dönem Ekle
            </button>
          </div>

          <ReproductiveForecastCard 
            forecast={forecast}
            loading={forecastLoading}
            error={forecastError}
            onRetry={refetchForecast}
          />



          {/* Geçmiş Kayıtlar */}
          {pastCycles.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <h4 className="text-[12px] font-black text-text-secondary uppercase tracking-wider mb-1">Geçmiş Dönemler</h4>
              {pastCycles.map(cycle => (
                <div key={cycle.id} className="p-4 rounded-card bg-white border border-border-main flex flex-col gap-3 transition-all hover:border-primary/30">
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
                      className="w-11 h-11 flex items-center justify-center rounded-full text-error/60 hover:text-error hover:bg-error/10 transition-all"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                  
                  <div className="mt-2">
                    <EstrusCycleDetails 
                      petId={petId}
                      petSpecies={petSpecies}
                      cycleId={cycle.id}
                      startDate={cycle.start_date}
                      endDate={cycle.end_date}
                      legacySymptoms={cycle.symptoms as string[]}
                      onDataChanged={refetchForecast}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Yeni Aktif Dönem Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-sheet shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border-main flex justify-between items-center bg-surface">
              <h3 className="text-[16px] font-black text-text-primary">Dönemi Başlat</h3>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Başlangıç Tarihi *</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  max={todayStr}
                  className="input-base w-full"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Kızgınlık Belirtileri</label>
                <div className="flex flex-wrap gap-2">
                  {availableSymptoms.map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleToggleSymptom(sym)}
                      className={`px-3 min-h-[44px] flex items-center justify-center rounded-full text-[12px] font-bold transition-all border ${symptoms.includes(sym) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-text-secondary border-border-main hover:border-primary/40'}`}
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
                  className="input-base min-h-[80px] resize-none w-full"
                  placeholder="Eklemek istediğiniz notlar..."
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-main bg-surface flex justify-end gap-3">
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="px-5 py-2.5 rounded-input text-[14px] font-bold text-text-secondary hover:bg-bg-main transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={handleSaveNew}
                disabled={!startDate || submitting}
                className="btn-primary px-6 py-2.5 rounded-input text-[14px] disabled:opacity-50"
              >
                {submitting ? 'Kaydediliyor...' : 'Dönemi Başlat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geçmiş Dönem Ekleme Modal */}
      {isHistoricalModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-sheet shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border-main flex justify-between items-center bg-surface">
              <h3 className="text-[16px] font-black text-text-primary">Geçmiş Dönemi Ekle</h3>
              <button 
                onClick={() => setIsHistoricalModalOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-text-primary">Başlangıç Tarihi *</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    max={todayStr}
                    className="input-base w-full"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-text-primary">Bitiş Tarihi *</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    max={todayStr}
                    min={startDate}
                    className="input-base w-full"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Belirtiler</label>
                <div className="flex flex-wrap gap-2">
                  {availableSymptoms.map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleToggleSymptom(sym)}
                      className={`px-3 min-h-[44px] flex items-center justify-center rounded-full text-[12px] font-bold transition-all border ${symptoms.includes(sym) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-text-secondary border-border-main hover:border-primary/40'}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-main bg-surface flex justify-end gap-3">
              <button 
                onClick={() => setIsHistoricalModalOpen(false)}
                className="px-5 py-2.5 rounded-input text-[14px] font-bold text-text-secondary hover:bg-bg-main transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={handleSaveHistorical}
                disabled={!startDate || !endDate || submitting}
                className="btn-primary px-6 py-2.5 rounded-input text-[14px] disabled:opacity-50"
              >
                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dönemi Bitir Modal */}
      {isEndModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-sheet shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border-main flex justify-between items-center bg-surface">
              <h3 className="text-[16px] font-black text-text-primary">Dönemi Bitir</h3>
              <button 
                onClick={() => setIsEndModalOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Bitiş Tarihi *</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  max={todayStr}
                  min={activeCycle?.start_date}
                  className="input-base w-full"
                  required
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-main bg-surface flex justify-end gap-3">
              <button 
                onClick={() => setIsEndModalOpen(false)}
                className="px-5 py-2.5 rounded-input text-[14px] font-bold text-text-secondary hover:bg-bg-main transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={handleEndCycle}
                disabled={!endDate || submitting}
                className="btn-primary px-6 py-2.5 rounded-input text-[14px] disabled:opacity-50"
              >
                {submitting ? 'Güncelleniyor...' : 'Dönemi Bitir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
