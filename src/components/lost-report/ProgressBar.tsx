'use client';
import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const ProgressBar = ({
  currentStep,
  totalSteps,
  onBack,
}: {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2 text-sm text-gray-600 font-medium">
        {currentStep > 1 && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            Önceki Adım
          </button>
        ) : (
          <span>Adım {currentStep} / {totalSteps}</span>
        )}
        {currentStep > 1 && onBack && (
          <span className="text-xs text-slate-500 font-medium">Adım {currentStep} / {totalSteps}</span>
        )}
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
