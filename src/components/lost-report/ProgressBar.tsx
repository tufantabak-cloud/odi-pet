'use client';
import React from 'react';

export const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between mb-2 text-sm text-gray-600 font-medium">
        <span>Adım {currentStep} / {totalSteps}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className="bg-primary-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};
