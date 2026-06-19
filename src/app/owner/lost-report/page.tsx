import React from 'react';
import { WizardForm } from '@/components/lost-report/WizardForm';

export default function LostReportPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">Kayıp İhbarı Oluştur</h1>
        <p className="mt-2 text-gray-600">Lütfen adımları takip ederek kayıp evcil hayvanınızın bilgilerini girin.</p>
      </div>
      
      <WizardForm />
    </div>
  );
}
