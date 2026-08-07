'use client';

import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, Settings2, ShieldAlert, Sparkles, Copy, Download } from 'lucide-react';
import { FeatureDetailDrawer } from './FeatureDetailDrawer';
import { BulkActionsBar } from './BulkActionsBar';

export function FeatureDataTable() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  // Mock data for UI demonstration
  const features = [
    { key: 'pdf_export', label: 'PDF Export', status: 'active', visibility: 'public', required_tier: 'pro', version: '1.2.0' },
    { key: 'ai_vet', label: 'AI Vet Assistant', status: 'beta', visibility: 'public', required_tier: 'ai_plus', version: '2.0.0' },
    { key: 'old_analytics', label: 'Legacy Analytics', status: 'deprecated', visibility: 'hidden', required_tier: 'free', version: '0.9.1' },
    { key: 'pdf_export_copy', label: 'PDF Export (V2 Draft)', status: 'pending_review', visibility: 'internal', required_tier: 'pro', version: '1.0.0' },
  ];

  const handleSelect = (key: string) => {
    setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const openDrawer = (f: any) => {
    setSelectedFeature(f);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search key, description, route, tags..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center">
          <Filter size={16} />
          <span>Filters</span>
          <span className="bg-slate-100 px-1.5 rounded text-xs text-slate-600">3</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="text-xs text-slate-400 font-semibold bg-slate-50/80 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 w-12 text-center">
                <input type="checkbox" className="rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500" />
              </th>
              <th className="px-4 py-3">Feature</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {features.map((f) => (
              <tr key={f.key} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => openDrawer(f)}>
                <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedKeys.includes(f.key)}
                    onChange={() => handleSelect(f.key)}
                    className="rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500" 
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{f.label}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{f.key}</div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                    f.status === 'active' ? 'bg-green-50 text-green-700' :
                    f.status === 'beta' ? 'bg-blue-50 text-blue-700' :
                    f.status === 'pending_review' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {f.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="capitalize">{f.visibility}</span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border ${
                    f.required_tier === 'ai_plus' ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-700'
                  }`}>
                    {f.required_tier === 'ai_plus' && <Sparkles size={12} />}
                    {f.required_tier}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedKeys.length > 0 && (
        <BulkActionsBar count={selectedKeys.length} onClear={() => setSelectedKeys([])} />
      )}

      {/* Detail Drawer */}
      <FeatureDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} feature={selectedFeature} />
    </div>
  );
}
