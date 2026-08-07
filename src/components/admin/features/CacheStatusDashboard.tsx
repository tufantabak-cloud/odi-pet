'use client';

import React from 'react';
import { Database, RotateCw, Server, Zap } from 'lucide-react';

export function CacheStatusDashboard() {
  return (
    <div className="card-base p-6 bg-white border border-slate-100 rounded-3xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Önbellek (Cache) Durumu
          </h3>
          <p className="text-xs text-slate-500">
            Sistemdeki önbellek mekanizmalarının güncel durumu ve yönetim paneli.
          </p>
        </div>
        <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 flex items-center gap-2">
          <RotateCw className="w-3.5 h-3.5" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Feature Registry
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-2xs font-bold">AKTİF</span>
            </div>
            <p className="text-xs text-slate-600">Kod ve veritabanı eşleşme önbelleği.</p>
          </div>
          <button className="w-full py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors">
            Temizle
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Entitlement Engine
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-2xs font-bold">AKTİF</span>
            </div>
            <p className="text-xs text-slate-600">Kullanıcı yetki ve kotalarının hesaplanmış sonuçları.</p>
          </div>
          <button className="w-full py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors">
            Temizle
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Broadcast Engine
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 text-2xs font-bold">BEKLEMEDE</span>
            </div>
            <p className="text-xs text-slate-600">WebSocket üzerinden gönderilecek anlık kota düşüşleri.</p>
          </div>
          <button className="w-full py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors">
            Tetikle
          </button>
        </div>
      </div>
    </div>
  );
}
