'use client';

import React from 'react';
import { X, Play, Slash, Ban, Tags, Eye, Copy, Download } from 'lucide-react';

export function BulkActionsBar({ count, onClear }: { count: number, onClear: () => void }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-[0_12px_32px_-4px_rgba(15,23,42,0.2)] flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
        <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
          {count}
        </span>
        <span className="text-sm font-medium">Selected</span>
        <button onClick={onClear} className="text-slate-400 hover:text-white transition-colors ml-1">
          <X size={16} />
        </button>
      </div>
      
      <div className="flex items-center gap-2">
        <ActionButton icon={<Play size={14} />} label="Activate" />
        <ActionButton icon={<Slash size={14} />} label="Disable" />
        <ActionButton icon={<Ban size={14} />} label="Deprecate" />
        <div className="w-px h-4 bg-slate-700 mx-2" />
        <ActionButton icon={<Tags size={14} />} label="Tier" />
        <ActionButton icon={<Eye size={14} />} label="Visibility" />
        <div className="w-px h-4 bg-slate-700 mx-2" />
        <ActionButton icon={<Copy size={14} />} label="Clone" />
        <ActionButton icon={<Download size={14} />} label="Export" />
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors">
      <span className="text-slate-400">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
