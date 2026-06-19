'use client';
import React, { useState, useEffect } from 'react';
import { ProgressBar } from './ProgressBar';
import { PhotoUpload } from './PhotoUpload';
import { LocationForm } from './LocationForm';
import { OTPVerification } from './OTPVerification';
import { PublishSummary } from './PublishSummary';

export const WizardForm = () => {
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState('');
  const [payload, setPayload] = useState<any>({});
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  }, []);

  const saveDraft = async (newData: any) => {
    const updatedPayload = { ...payload, ...newData };
    setPayload(updatedPayload);
    await fetch('/api/v1/reports/lost/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, payload: updatedPayload, action: 'save_draft' })
    });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PhotoUpload sessionId={sessionId} onNext={(data) => { saveDraft({ photo: data }); setStep(2); }} />;
      case 2:
        return <LocationForm onNext={(data) => { saveDraft({ location: data }); setStep(3); }} />;
      case 3:
        return <OTPVerification onNext={() => { setStep(4); }} />;
      case 4:
        return <PublishSummary sessionId={sessionId} payload={payload} onPublish={(id) => setReportId(id)} />;
      default:
        return null;
    }
  };

  if (reportId) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-md text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">İlan Yayınlandı!</h2>
        <p className="text-gray-600 mb-4">Kayıp ilanınız başarıyla oluşturuldu.</p>
        <p className="text-sm text-gray-500 font-mono bg-gray-100 p-2 rounded inline-block">ID: {reportId}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full mx-auto">
      <ProgressBar currentStep={step} totalSteps={4} />
      <div className="min-h-[300px]">
        {renderStep()}
      </div>
    </div>
  );
};
