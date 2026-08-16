'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, Pencil } from 'lucide-react';
import { categoryThemes, CategoryKey } from '@/lib/categoryThemes';
import { useWizardStore } from '@/store/wizardStore';

export interface WizardStepData {
  title: string;
  summary?: string;
  content: React.ReactNode;
}

interface WizardShellProps {
  category: CategoryKey;
  subCategoryTitle?: string;
  planTitle?: string;
  petName?: string;
  steps: WizardStepData[];
  onNext?: () => void;
  onSkip?: () => void;
  onBack?: () => void;
  onSubmit?: () => void;
  canSkip?: boolean;
  isNextDisabled?: boolean;
  isSubmitting?: boolean;
  nextText?: string;
  skipText?: string;
  /** Son adımdaki kaydet butonu metni (varsayılan: "Planı Kaydet") */
  submitText?: string;
  /** Düzenleme modu: tüm adımlar tek sayfada açık form olarak gösterilir */
  editAll?: boolean;
}

export function WizardShell({
  category,
  subCategoryTitle,
  planTitle,
  petName,
  steps,
  onNext,
  onSkip,
  onBack,
  onSubmit,
  canSkip = false,
  isNextDisabled = false,
  isSubmitting = false,
  nextText = 'Devam et',
  skipText = 'Atla',
  submitText = 'Planı Kaydet',
  editAll = false,
}: WizardShellProps) {
  const router = useRouter();
  const { stepIndex, prevStep, setStepIndex, wizardData } = useWizardStore();
  const theme = categoryThemes[category];

  const totalSteps = steps.length;
  const currentStep = Math.min(stepIndex, totalSteps - 1);
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;

  const categoryLabel = theme?.label || 'Planlama';
  const effectiveSubCat =
    subCategoryTitle ||
    (wizardData?.subCategory !== 'Diğer' ? wizardData?.subCategory : wizardData?.customText) ||
    wizardData?.selectedVaccine?.name ||
    wizardData?.selectedProduct?.product_name ||
    '';

  const headerDisplayTitle = planTitle
    ? planTitle
    : effectiveSubCat
      ? `${effectiveSubCat} Planı`
      : `${categoryLabel} Planı`;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (stepIndex > 0) {
      prevStep();
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else if (onNext) {
      onNext();
    }
  };

  const goToStep = (index: number) => {
    setStepIndex(index);
  };

  if (editAll) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between px-4 h-14 max-w-3xl mx-auto w-full">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 flex items-center justify-center -ml-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-slate-700" />
            </button>
            <div className="flex flex-col items-center justify-center text-center absolute left-1/2 -translate-x-1/2 min-w-0 max-w-[65%] px-2">
              <span className="text-xs font-bold truncate w-full" style={{ color: theme?.textColor || '#1E293B' }}>
                {headerDisplayTitle}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Planı Düzenle
              </span>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full pb-[110px]">
          <div className="max-w-3xl mx-auto w-full flex flex-col px-4 pt-4">
            {steps.map((step, index) => (
              <div key={index} className="card-base p-4 mb-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.progressColor }}>
                    <span className="text-[12px] font-medium text-white">{index + 1}</span>
                  </div>
                  <p className="text-[14px] font-medium text-text-primary">{step.title}</p>
                </div>
                {step.content}
              </div>
            ))}
          </div>
        </main>

        {/* Sabit Kaydet Butonu */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 py-3">
          <div className="max-w-3xl mx-auto w-full">
            <button
              onClick={onSubmit}
              disabled={isNextDisabled || isSubmitting}
              className={`w-full py-3.5 rounded-xl font-bold text-base transition-all
                ${isNextDisabled || isSubmitting
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'text-white hover:opacity-90 active:scale-[0.98] shadow-md'
                }`}
              style={{ backgroundColor: (isNextDisabled || isSubmitting) ? undefined : theme.progressColor }}
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          <div className="flex flex-col items-center justify-center text-center absolute left-1/2 -translate-x-1/2 min-w-0 max-w-[65%] px-2">
            <span className="text-xs font-bold truncate w-full" style={{ color: theme?.textColor || '#1E293B' }}>
              {headerDisplayTitle}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              Adım {currentStep + 1} / {totalSteps}
            </span>
          </div>

          <div className="w-10"></div>
        </div>
      </header>

      {/* Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full pb-[100px]">
        <div className="max-w-3xl mx-auto w-full flex flex-col px-4 pt-4">
          {/* Active Planning Context Banner */}
          <div
            className="mb-3 px-4 py-3 rounded-2xl border flex items-center justify-between shadow-2xs"
            style={{
              backgroundColor: theme?.bgLight || '#F8FAFC',
              borderColor: theme?.progressColor ? `${theme.progressColor}35` : '#E2E8F0',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-xs shrink-0"
                style={{ backgroundColor: theme?.progressColor || '#6366F1' }}
              >
                <span className="uppercase text-[11px] tracking-wider">{categoryLabel.substring(0, 2)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  {categoryLabel} {effectiveSubCat ? `• ${effectiveSubCat}` : 'Planlaması'}
                </p>
                <h2 className="text-sm font-bold truncate" style={{ color: theme?.textColor || '#0F172A' }}>
                  {headerDisplayTitle}
                </h2>
              </div>
            </div>
          </div>
          {steps.map((step, index) => {
            // 1. TAMAMLANAN ADIMLAR
            if (currentStep > index) {
              return (
                <div key={`completed-${index}`} className="card-base p-3 mb-2 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check size={13} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-text-muted">{step.title}</p>
                    <p className="text-[13px] font-medium text-text-primary">{step.summary ?? '—'}</p>
                  </div>
                  <button onClick={() => goToStep(index)} className="p-1">
                    <Pencil size={14} className="text-text-muted" />
                  </button>
                </div>
              );
            }

            // 2. AKTİF ADIM
            if (currentStep === index) {
              return (
                <div key={`active-${index}`} className="card-base p-4 mb-2 border-2" style={{ borderColor: theme.progressColor }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.progressColor }}>
                      <span className="text-[12px] font-medium text-white">{index + 1}</span>
                    </div>
                    <p className="text-[14px] font-medium text-text-primary">{step.title}</p>
                  </div>
                  
                  {step.content}
                  
                  <button
                    onClick={handleNext}
                    disabled={isNextDisabled || isSubmitting}
                    className={`w-full py-3 rounded-xl font-medium text-[14px] mt-4 transition-all
                      ${isNextDisabled || isSubmitting 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'text-white hover:opacity-90 active:scale-[0.98]'
                      }`}
                    style={{ backgroundColor: (isNextDisabled || isSubmitting) ? undefined : theme.progressColor }}
                  >
                    {isSubmitting ? 'Kaydediliyor...' : (isLastStep ? submitText : nextText)}
                  </button>

                  {canSkip && !isLastStep && (
                    <button
                      onClick={onSkip}
                      className="w-full py-3 px-6 mt-2 rounded-xl font-medium text-[14px] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-[0.98]"
                    >
                      {skipText}
                    </button>
                  )}
                </div>
              );
            }

            // 3. BEKLEYEN ADIMLAR
            return (
              <div key={`pending-${index}`} className="card-base p-3 mb-2 flex items-center gap-3 opacity-40">
                <div className="w-6 h-6 rounded-full border-[1.5px] border-border-strong flex items-center justify-center flex-shrink-0">
                  <span className="text-[12px] text-text-muted">{index + 1}</span>
                </div>
                <p className="text-[13px] text-text-secondary">{step.title}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
