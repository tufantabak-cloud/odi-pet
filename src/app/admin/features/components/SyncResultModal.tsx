'use client';

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export function SyncResultModal({ isOpen, onClose, result }: { isOpen: boolean, onClose: () => void, result: any }) {
  if (!isOpen || !result) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        
        <div className="p-6 text-center bg-slate-50 border-b border-slate-100">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sync Completed</h2>
          <p className="text-sm text-slate-500 mt-1">Registry version {result.registryVersion} synchronized.</p>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Created" value={result.created} color="text-green-600" />
            <Stat label="Updated" value={result.updated} color="text-blue-600" />
            <Stat label="Deprecated" value={result.deprecated} color="text-orange-600" />
            <Stat label="Unchanged" value={result.unchanged} color="text-slate-600" />
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-xs font-mono text-slate-600 space-y-2 border border-slate-100">
            <div className="flex justify-between"><span>Sync ID</span><span className="font-semibold">{result.syncId}</span></div>
            <div className="flex justify-between"><span>Schema Version</span><span className="font-semibold">{result.schemaVersion}</span></div>
            <div className="flex justify-between"><span>Sync Source</span><span className="font-semibold">{result.syncSource}</span></div>
            <div className="flex justify-between"><span>Actor</span><span className="font-semibold">{result.actor}</span></div>
            <div className="flex justify-between"><span>Duration</span><span className="font-semibold">{result.duration}ms</span></div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <button onClick={onClose} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors active:scale-[0.98]">
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
