'use client';

import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';

interface RegistryHealthDashboardProps {
  totalFeatures: number;
}

export function RegistryHealthDashboard({ totalFeatures }: RegistryHealthDashboardProps) {
  // In a real scenario, this would fetch data comparing registry.ts and feature_limits table
  // For now, we mock the health metrics
  const missingInDB = 0;
  const duplicateKeys = 0;
  const unusedFeatures = 2; // Features in DB but not in registry.ts

  return (
    <div className="card-base p-6 bg-white border border-slate-100 rounded-3xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Registry & DB Health
          </h3>
          <p className="text-xs text-slate-500">
            Kod tabanlı Registry (registry.ts) ile Veritabanı arasındaki uyumsuzlukları tespit eder.
          </p>
        </div>
        <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 flex items-center gap-2">
          <RotateCw className="w-3.5 h-3.5" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-2xs font-bold text-slate-500 uppercase">Kayıtlı Özellik</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalFeatures}</div>
        </div>

        <div className={`p-4 rounded-2xl border ${missingInDB > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className={`text-2xs font-bold uppercase ${missingInDB > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            DB'de Eksik
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            {missingInDB}
            {missingInDB > 0 ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${duplicateKeys > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className={`text-2xs font-bold uppercase ${duplicateKeys > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            Çakışan Key
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            {duplicateKeys}
            {duplicateKeys > 0 ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${unusedFeatures > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className={`text-2xs font-bold uppercase ${unusedFeatures > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
            Zombi Kayıtlar
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            {unusedFeatures}
            {unusedFeatures > 0 ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </div>
        </div>
      </div>
    </div>
  );
}
