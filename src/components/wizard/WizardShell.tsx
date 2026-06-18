'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { categoryThemes, CategoryKey } from '@/lib/categoryThemes';
import { useWizardStore } from '@/store/wizardStore';

interface WizardShellProps {
  category: CategoryKey;
  totalSteps: number;
  children: React.ReactNode;
  onNext?: () => void;
  onSkip?: () => void;
  onSubmit?: () => void;
  canSkip?: boolean;
  isNextDisabled?: boolean;
  isSubmitting?: boolean;
  nextText?: string;
  skipText?: string;
}

export function WizardShell({
  category,
  totalSteps,
  children,
  onNext,
  onSkip,
  onSubmit,
  canSkip = false,
  isNextDisabled = false,
  isSubmitting = false,
  nextText = 'Devam',
  skipText = 'Atla',
}: WizardShellProps) {
  const router = useRouter();
  const { stepIndex, prevStep } = useWizardStore();
  const theme = categoryThemes[category];

  const handleBack = () => {
    if (stepIndex > 0) {
      prevStep();
    } else {
      router.back();
    }
  };

  const progressPercentage = ((stepIndex + 1) / totalSteps) * 100;
  const isLastStep = stepIndex === totalSteps - 1;

  const handleNextClick = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else if (onNext) {
      onNext();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%`, backgroundColor: theme.progressColor }}
          />
        </div>
        
        <div className="flex items-center justify-between px-4 h-14 max-w-3xl mx-auto w-full">
          <button 
            onClick={handleBack} 
            className="w-11 h-11 flex items-center justify-center -ml-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-700" />
          </button>
          
          <div className="text-[15px] font-semibold text-slate-500 absolute left-1/2 -translate-x-1/2">
            Adım {stepIndex + 1} / {totalSteps}
          </div>
          
          <div className="w-10"></div>
        </div>
      </header>

      {/* Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        <div className="max-w-3xl mx-auto w-full min-h-[calc(100vh-8rem)] flex flex-col pb-32 pb-safe relative">
          {children}
        </div>
      </main>

      {/* Footer / Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 p-4 pb-safe-offset-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row-reverse gap-3">
          <button
            onClick={handleNextClick}
            disabled={isNextDisabled || isSubmitting}
            className={`w-full py-3.5 px-6 rounded-2xl font-semibold text-[16px] transition-all duration-300 shadow-sm
              ${isNextDisabled || isSubmitting 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'text-white hover:opacity-90 active:scale-[0.98]'
              }
            `}
            style={{ backgroundColor: (isNextDisabled || isSubmitting) ? undefined : theme.progressColor }}
          >
            {isSubmitting ? 'Kaydediliyor...' : isLastStep ? 'Planı Kaydet' : nextText}
          </button>
          
          {canSkip && !isLastStep && (
            <button
              onClick={onSkip}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold text-[16px] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              {skipText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
