'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';

interface OnboardingProgressCardProps {
  petId: string;
  petName: string;
  forcePasif?: boolean; // Smart Card listesi için zorunlu pasif mod desteği
}

export default function OnboardingProgressCard({
  petId,
  petName,
  forcePasif = false
}: OnboardingProgressCardProps) {
  const router = useRouter();
  const { progress, snooze } = useOnboardingProgress(petId);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (progress?.isComplete) {
      // Tamamlandığında kutlama mesajı göster
      setToastMessage(`${petName}'in profili tamamlandı! ğŸ†`);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [progress?.isComplete, petName]);

  if (!progress || progress.isComplete) return null;

  // Sıradaki tamamlanmamış adım
  const nextStep = progress.steps.find((s) => !s.done);

  // Aktif mod koşulu: ilk 7 gün içinde, snooze edilmemiş ve forcePasif değilse
  const isAktifMode = progress.isActivePeriod && !progress.isSnoozed && !forcePasif;

  // Başarı toast bildirimi
  const toastEl = showToast && (
    <div
      className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-[9999] animate-in slide-in-from-bottom flex items-center space-x-2 text-white font-medium bg-green-600"
      style={{ fontFamily: 'inherit' }}
    >
      <i className="ti ti-shield-check text-xl" />
      <span>{toastMessage}</span>
    </div>
  );

  // ERTELEME (SNOOZE) AKSİYONU
  const handleSnooze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await snooze();
  };

  // 1) AKTİF MOD (Tam Kart)
  if (isAktifMode) {
    return (
      <>
        <div 
          className="bg-white border border-[#E2E0FA] rounded-2xl p-5 mb-4 shadow-sm"
          style={{ fontFamily: 'inherit' }}
          data-testid="next-step-card"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-base font-bold text-[#26215C] mb-1">
                {petName} için Kurulum Rehberi
              </h3>
              <p className="text-xs text-[#6F6B99]">
                Profil gücünü artırarak en iyi deneyimi elde et.
              </p>
            </div>
            <span className="text-sm font-bold text-[#534AB7] bg-[#EEEDFE] px-2.5 py-1 rounded-full">
              %{progress.percentage}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#F3F2FD] h-2 rounded-full mb-4 overflow-hidden">
            <div 
              className="bg-[#534AB7] h-full rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* Adımlar listesi */}
          <div className="space-y-3 mb-5">
            {progress.steps.map((step) => (
              <div 
                key={step.id} 
                className="flex items-center justify-between py-1 cursor-pointer"
                onClick={() => router.push(step.route)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    step.done ? 'bg-[#E7F8F0] text-[#0D9488]' : 'bg-[#F5F5FC] text-[#6F6B99]'
                  }`}>
                    <i className={`${step.icon} text-lg`} />
                  </div>
                  <span className={`text-sm ${
                    step.done ? 'text-[#8E8BBA] line-through' : 'text-[#26215C] font-medium'
                  }`}>
                    {step.label}
                  </span>
                </div>
                <div>
                  {step.done ? (
                    <i className="ti ti-circle-check text-[#0D9488] text-xl" />
                  ) : (
                    <i className="ti ti-circle text-[#C5C2E6] text-xl hover:text-[#534AB7]" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Aksiyonlar */}
          <div className="flex gap-2">
            <button
              onClick={handleSnooze}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#D5D2F2] text-xs font-semibold text-[#534AB7] hover:bg-[#EEEDFE] transition-colors min-h-[44px]"
            >
              Daha sonra hatırlat
            </button>
            {nextStep && (
              <button
                onClick={() => router.push(nextStep.route)}
                data-testid="next-step-primary-button"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#534AB7] text-xs font-semibold text-white hover:bg-[#443C9E] transition-colors min-h-[44px]"
              >
                Sıradaki Adım
              </button>
            )}
          </div>
        </div>
        {toastEl}
      </>
    );
  }

  // 2) PASİF MOD (Küçük Satır Kartı)
  return (
    <>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="next-step-card"
        className="bg-white border border-[#E2E0FA] rounded-xl p-3 mb-3 cursor-pointer shadow-sm hover:border-[#534AB7] transition-all"
        style={{ fontFamily: 'inherit' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-[#EEEDFE] flex items-center justify-center text-[#534AB7]">
              <i className="ti ti-sparkles text-base" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1 pr-2">
                <span className="text-xs font-bold text-[#26215C]">
                  %{progress.percentage} Â· {progress.totalCount - progress.completedCount} adım kaldı
                </span>
                <span className="text-[10px] text-[#6F6B99]">Kurulum devam ediyor</span>
              </div>
              <div className="w-full bg-[#F3F2FD] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#534AB7] h-full rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          </div>
          <div className="pl-2">
            <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-right'} text-[#6F6B99]`} />
          </div>
        </div>

        {/* Pasif modda tıklayıp genişletildiğinde adım detayları gösterilir */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[#F3F2FD] space-y-2 animate-in fade-in duration-200">
            {progress.steps.map((step) => (
              <div 
                key={step.id}
                className="flex items-center justify-between py-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(step.route);
                }}
              >
                <div className="flex items-center gap-2">
                  <i className={`${step.icon} text-sm ${step.done ? 'text-[#0D9488]' : 'text-[#8E8BBA]'}`} />
                  <span className={`text-xs ${step.done ? 'text-[#8E8BBA] line-through' : 'text-[#26215C]'}`}>
                    {step.label}
                  </span>
                </div>
                <i className={`ti ${step.done ? 'ti-check text-[#0D9488]' : 'ti-circle text-[#C5C2E6]'} text-sm`} />
              </div>
            ))}
          </div>
        )}
      </div>
      {toastEl}
    </>
  );
}
