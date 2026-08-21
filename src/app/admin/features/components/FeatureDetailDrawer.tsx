'use client';

import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

export function FeatureDetailDrawer({ isOpen, onClose, feature }: { isOpen: boolean, onClose: () => void, feature: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'limits' | 'history' | 'audit' | 'metadata'>('overview');

  if (!isOpen || !feature) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] bg-white shadow-2xl z-50 flex flex-col sm:rounded-l-3xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{feature.label}</h2>
            <p className="text-sm text-slate-500 font-mono mt-1">{feature.key}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-6 border-b border-slate-100 overflow-x-auto scrollbar-none">
          <Tab id="overview" label="Overview" active={activeTab} onClick={setActiveTab} />
          <Tab id="limits" label="Limits" active={activeTab} onClick={setActiveTab} />
          <Tab id="history" label="Version History" active={activeTab} onClick={setActiveTab} />
          <Tab id="audit" label="Audit Trail" active={activeTab} onClick={setActiveTab} />
          <Tab id="metadata" label="Metadata" active={activeTab} onClick={setActiveTab} />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Field label="Description" value={feature.description || 'No description provided.'} isTextArea />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status" value={feature.status} />
                <Field label="Visibility" value={feature.visibility} />
                <Field label="Display Order" value="0" />
                <Field label="Required Tier" value={feature.required_tier} />
              </div>
            </div>
          )}
          {activeTab === 'limits' && <div className="text-slate-500 text-sm">Limit configurations would render here...</div>}
          {activeTab === 'history' && <div className="text-slate-500 text-sm">Version history timeline here...</div>}
          {activeTab === 'audit' && <div className="text-slate-500 text-sm">Audit trail (Before/After Diff) here...</div>}
          {activeTab === 'metadata' && (
            <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify({ rollout: { percentage: 20 }, ui: { accent: "purple" } }, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 sm:rounded-bl-3xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
            Cancel
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98]">
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}

function Tab({ id, label, active, onClick }: { id: any, label: string, active: string, onClick: (id: any) => void }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)}
      className={`py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
        isActive ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, value, isTextArea }: { label: string, value: string, isTextArea?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
      {isTextArea ? (
        <textarea readOnly className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none min-h-[100px]" defaultValue={value} />
      ) : (
        <div className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-medium">{value}</div>
      )}
    </div>
  );
}
