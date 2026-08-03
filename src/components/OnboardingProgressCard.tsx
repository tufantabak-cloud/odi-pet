'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { ShieldCheck, Sparkles, ChevronDown, CheckCircle2, Circle } from 'lucide-react';

interface OnboardingProgressCardProps {
  petId?: string;
  petName?: string;
  suppressStepIds?: string[];
}

export default function OnboardingProgressCard({
  petId = '',
  petName = 'Evcil Hayvanınız',
  suppressStepIds = [],
}: OnboardingProgressCardProps) {
  const router = useRouter();
  const { progress, snooze } = useOnboardingProgress(petId);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!progress) {
    return (
      <div className="bg-white border border-border-main rounded-sheet p-5 mb-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-2 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  if (progress.isComplete || progress.isSnoozed) return null;

  const incompleteSteps = progress.steps.filter((s) => !s.done);
  const nextStepForCta = incompleteSteps.find((s) => !suppressStepIds.includes(s.id));

  const toastEl = showToast && (
    <div className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg z-[9999] animate-in slide-in-from-bottom flex items-center space-x-2 text-white font-medium bg-green-600">
      <ShieldCheck className="w-5 h-5 shrink-0" />
      <span>{toastMessage}</span>
    </div>
  );

  const handleSnooze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await snooze();
  };

  if (isCollapsed) {
    return (
      <div 
        onClick={() => setIsCollapsed(false)}
        className="bg-white border border-[#E2E0FA] rounded-xl p-3 mb-4 cursor-pointer shadow-sm hover:border-primary transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary-soft flex items-center justify-center text-primary">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
          </div>
          <span className="text-xs font-semibold text-[#26215C]">
            %{progress.percentage} · {petName} için Kurulum Rehberi
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-[#6F6B99]">Genişlet</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#6F6B99]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-[#E2E0FA] rounded-sheet p-5 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-[#26215C]">
              {petName} için Kurulum Rehberi
            </h3>
          </div>
          <span className="text-xs font-bold text-primary">
            %{progress.percentage}
          </span>
        </div>

        <div className="w-full bg-[#F5F5FC] h-2 rounded-full mb-4 overflow-hidden">
          <div 
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <div className="space-y-2 mb-4">
          {progress.steps.map((step) => (
            <div
              key={step.id}
              onClick={() => router.push(step.route)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F5F5FC] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm ${
                  step.done ? 'text-[#8E8BBA] line-through' : 'text-[#26215C] font-medium'
                }`}>
                  {step.label}
                </span>
              </div>
              <div>
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Circle className="w-5 h-5 text-[#C5C2E6] hover:text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSnooze}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[#D5D2F2] text-xs font-semibold text-primary hover:bg-primary-soft transition-colors min-h-[44px]"
          >
            Daha sonra hatırlat
          </button>
          {nextStepForCta && (
            <button
              onClick={() => router.push(nextStepForCta.route)}
              data-testid="next-step-primary-button"
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-xs font-semibold text-white hover:bg-primary-hover transition-colors min-h-[44px]"
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
