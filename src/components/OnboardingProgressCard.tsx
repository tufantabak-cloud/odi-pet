'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';

interface OnboardingProgressCardProps {
  petId: string;
  petName: string;
  suppressStepIds?: string[];
}

export default function OnboardingProgressCard({
  petId,
  petName,
  suppressStepIds = []
}: OnboardingProgressCardProps) {
  const router = useRouter();
  const { progress, snooze } = useOnboardingProgress(petId);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [isAutoHideEnabled, setIsAutoHideEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`odi_onboarding_autohide_${petId}`);
      return stored === 'true';
    }
    return false;
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem(`odi_onboarding_autohide_${petId}`, String(isAutoHideEnabled));
  }, [isAutoHideEnabled, petId]);

  useEffect(() => {
    if (!isAutoHideEnabled) {
      setIsCollapsed(false);
      return;
    }

    // 4 saniye sonra otomatik daralt
    const timer = setTimeout(() => {
      setIsCollapsed(true);
    }, 4000);

    // Kaydırınca otomatik daralt
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isAutoHideEnabled]);

  useEffect(() => {
    if (progress?.isComplete) {
      // Tamamlandığında kutlama mesajı göster
      setToastMessage(`${petName}'in profili tamamlandı! 🎉`);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [progress?.isComplete, petName]);

  if (!progress || progress.isComplete || progress.isSnoozed) return null;

  // Sıradaki tamamlanmamış ve bastırılmamış (un-suppressed) adım CTA için
  const incompleteSteps = progress.steps.filter((s) => !s.done);
  const nextStepForCta = incompleteSteps.find((s) => !suppressStepIds.includes(s.id));

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

  // Daraltılmış/Küçülmüş Mod Görünümü
  if (isCollapsed) {
    return (
      <div 
        onClick={() => setIsCollapsed(false)}
        className="bg-white border border-[#E2E0FA] rounded-xl p-3 mb-4 cursor-pointer shadow-sm hover:border-[#534AB7] transition-all flex items-center justify-between"
        style={{ fontFamily: 'inherit' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#EEEDFE] flex items-center justify-center text-[#534AB7]">
            <i className="ti ti-sparkles text-xs" />
          </div>
          <span className="text-xs font-semibold text-[#26215C]">
            %{progress.percentage} · {petName} için Kurulum Rehberi
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-[#6F6B99]">Genişlet</span>
          <i className="ti ti-chevron-down text-[#6F6B99] text-xs" />
        </div>
      </div>
    );
  }

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
            <h3 className="text-base font-semibold text-[#26215C] mb-1">
              {petName} için Kurulum Rehberi
            </h3>
            <p className="text-xs text-[#6F6B99]">
              Profil gücünü artırarak en iyi deneyimi elde et.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Otomatik Gizle Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
              <span className="text-2xs text-[#6F6B99] font-semibold">Otomatik Gizle</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={isAutoHideEnabled} 
                  onChange={(e) => setIsAutoHideEnabled(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#534AB7]"></div>
              </div>
            </label>
            <span className="text-xs font-semibold text-[#534AB7] bg-[#EEEDFE] px-2.5 py-1 rounded-full">
              %{progress.percentage}
            </span>
          </div>
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
          {nextStepForCta && (
            <button
              onClick={() => router.push(nextStepForCta.route)}
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
