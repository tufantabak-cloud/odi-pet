'use client';
import React, { useState } from 'react';
import featureIndex from '@/lib/features/feature-index.json';
import { Search, Database, LayoutTemplate, Zap, Shield, Tags } from 'lucide-react';

export default function GlobalFeatureSearchPage() {
  const [query, setQuery] = useState('');

  const filteredFeatures = featureIndex.filter(f => 
    f.featureKey.toLowerCase().includes(query.toLowerCase()) || 
    (f.metadata && (f.metadata as any).owner && (f.metadata as any).owner.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Global Feature Search</h1>
          <p className="text-sm text-slate-500 mt-1">Search through the static AST build-time index (feature-index.json).</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by feature key or owner..." 
          className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {filteredFeatures.map(f => (
          <div key={f.featureKey} className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-900">{f.featureKey}</h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">{f.state}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Shield size={16} className="text-blue-500" />
                <span>Guards: {f.guards.length || 'Auto-Detected'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Database size={16} className="text-green-500" />
                <span>Quota: {f.quota ? 'Tracked' : 'None'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <LayoutTemplate size={16} className="text-orange-500" />
                <span>Components: {f.components.length || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Zap size={16} className="text-yellow-500" />
                <span>APIs: {f.apis.length || 'N/A'}</span>
              </div>
            </div>

            {(f.metadata as any)?.owner && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                <Tags size={16} className="text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Owner: {(f.metadata as any).owner}</span>
              </div>
            )}
          </div>
        ))}

        {filteredFeatures.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-12 text-slate-500">
            No features found matching "{query}"
          </div>
        )}
      </div>
    </div>
  );
}
