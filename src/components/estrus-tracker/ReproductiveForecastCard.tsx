import React from 'react';
import { ReproductiveForecastData } from './useReproductiveForecast';
import { ForecastConfidenceBadge } from './ForecastConfidenceBadge';
import { Activity, Info, CalendarDays, ShieldAlert, HeartPulse } from 'lucide-react';

interface ReproductiveForecastCardProps {
  forecast: ReproductiveForecastData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const mapStateToLabel = (state: string) => {
  switch (state) {
    case 'active_observation_period': return 'Belirtiler takip ediliyor';
    case 'test_supported_monitoring': return 'Test sonuçlarıyla birlikte takip ediliyor';
    case 'insufficient_data': return 'Döngü bilgileri kontrol edilmeli';
    case 'cycle_ended': return 'Dönem tamamlandı';
    default: return 'Aktif dönem bulunmuyor';
  }
};

const formatTurkishDate = (dateString: string | null | undefined) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTurkishDateShort = (dateString: string | null | undefined) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
};

export function ReproductiveForecastCard({ forecast, loading, error, onRetry }: ReproductiveForecastCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[200px] animate-pulse">
        <Activity className="w-8 h-8 text-pink-300 mb-3" />
        <p className="text-gray-500 font-medium">Döngü bilgileri hazırlanıyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 flex flex-col items-center justify-center min-h-[200px]">
        <ShieldAlert className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-gray-600 font-medium text-center mb-4">Tahmin bilgileri şu anda yüklenemedi.</p>
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors min-h-[44px]"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!forecast) {
    return null;
  }

  const { species, activeCycle, nextHeatWindow, behavioralObservationWindow, confidence, advisories } = forecast;

  return (
    <div className="space-y-4 w-full">
      
      {/* Active Cycle Card */}
      {activeCycle && activeCycle.state !== 'no_active_cycle' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-400 to-purple-500"></div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold mb-1 text-sm md:text-base">Aktif kızgınlık dönemi</h3>
              {activeCycle.cycleDay && (
                <p className="text-gray-700 font-medium mb-1">Döngünün {activeCycle.cycleDay}. günü</p>
              )}
              <p className="text-gray-500 text-xs md:text-sm">{mapStateToLabel(activeCycle.state)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cat Specific Card */}
      {species === 'cat' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 shadow-sm border border-blue-100 relative overflow-hidden group">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-blue-800 leading-relaxed">
              Kedilerde kızgınlık dönemleri mevsim, yaşam ortamı ve bireysel özelliklere göre değişebilir. Odi aktif belirtileri takip eder ancak kesin bir sonraki tarih üretmez.
            </p>
          </div>
        </div>
      )}

      {/* Next Heat Window (Dogs Only) */}
      {species === 'dog' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold text-sm md:text-base">Sonraki tahmini kızgınlık dönemi</h3>
              <div className="mt-1">
                <ForecastConfidenceBadge level={confidence.nextHeat} />
              </div>
            </div>
          </div>
          
          <div className="ml-4 pl-4 md:ml-12 md:pl-4 border-l-2 border-indigo-50/50">
            {nextHeatWindow ? (
              <>
                <p className="text-lg font-bold text-gray-900 mb-2 flex flex-wrap gap-1">
                  <span className="whitespace-nowrap">{formatTurkishDateShort(nextHeatWindow.start)}</span>
                  <span>–</span>
                  <span className="whitespace-nowrap">{formatTurkishDate(nextHeatWindow.end)}</span>
                </p>
                <p className="text-xs text-gray-500">Geçmiş döngü kayıtlarına göre hesaplanmıştır.</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-2 font-medium">Henüz kişisel tahmin oluşturmak için yeterli döngü kaydı yok.</p>
                <p className="text-xs text-gray-500">Her yeni dönemi kaydettikçe tahmin Odi tarafından otomatik olarak geliştirilecektir.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Behavioral Observation Window */}
      {behavioralObservationWindow && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform">
              <HeartPulse className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold text-sm md:text-base">Belirtilerin gözlemlendiği dönem</h3>
              <div className="mt-1">
                <ForecastConfidenceBadge level={confidence.behavioralObservation} />
              </div>
            </div>
          </div>
          
          <div className="ml-4 pl-4 md:ml-12 md:pl-4 border-l-2 border-rose-50/50">
            <p className="text-base font-bold text-gray-900 mb-3 flex flex-wrap gap-1">
              <span className="whitespace-nowrap">{formatTurkishDateShort(behavioralObservationWindow.start)}</span>
              <span>–</span>
              <span className="whitespace-nowrap">{formatTurkishDateShort(behavioralObservationWindow.end)}</span>
            </p>
            {behavioralObservationWindow.observedSigns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {behavioralObservationWindow.observedSigns.map(sign => (
                  <span key={sign} className="inline-flex px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md border border-gray-200">
                    {/* Translate common codes, fallback to code */}
                    {sign === 'BLEEDING' ? 'Kanama' : 
                     sign === 'VULVAR_SWELLING' ? 'Vulva şişliği' : 
                     sign === 'RESTLESSNESS' ? 'Huzursuzluk' : 
                     sign === 'VOCALIZATION' ? 'Aşırı miyavlama' : 
                     sign}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advisories */}
      {advisories && advisories.length > 0 && (
        <div className="space-y-2">
          {Array.from(new Map(advisories.map(a => [a.code, a])).values()).map((advisory) => {
            // Map common advisory codes to user-friendly messages
            let message = advisory.message;
            if (advisory.code === 'NEUTERED_ESTRUS_SIGNS_VET_REVIEW') {
              message = 'Kısırlaştırılmış petinizde kızgınlık belirtileri gözlemliyorsanız veterinerinize danışın.';
            } else if (advisory.code === 'INSUFFICIENT_CYCLE_HISTORY') {
              message = 'Tahminin gelişmesi için gelecekteki dönemleri kaydetmeye devam edin.';
            } else if (advisory.code === 'UNVERIFIED_TEST_DATA') {
              message = 'Test kaydı takipte kullanılıyor ancak doğrulanmış kabul edilmiyor.';
            }

            return (
              <div key={advisory.code} className="bg-orange-50/50 rounded-xl p-4 flex gap-3 items-start border border-orange-100">
                <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reproductive Window Safety Disclaimer */}
      <div className="text-center px-4 mt-2">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Çiftleşme zamanlaması yalnızca takvim ve belirtilerle güvenilir şekilde belirlenemez. Gerektiğinde veteriner değerlendirmesinden yararlanın.
        </p>
      </div>

    </div>
  );
}
