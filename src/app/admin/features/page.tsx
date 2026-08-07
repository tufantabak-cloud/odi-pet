import React from 'react';
import { FeatureDataTable } from './components/FeatureDataTable';
import { SyncResultModal } from './components/SyncResultModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Using OPOS Design System Rules
// 24px radius for main containers, Lucide icons, 8pt grid, Primary colors

export default function AdminFeaturesPage() {
  // In a real implementation, this would fetch from AdminQueries
  const pendingReviewCount = 7; 

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feature Registry</h1>
          <p className="text-sm text-slate-500 mt-1">Manage feature toggles, limits, and versioning across all platforms.</p>
        </div>
        
        <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
          <RefreshCw size={16} />
          <span>Sync Registry</span>
        </button>
      </div>

      {/* Pending Review Banner - Required by UX feedback */}
      {pendingReviewCount > 0 && (
        <div className="flex items-center justify-between bg-purple-50 border border-purple-100 p-4 rounded-[24px] shadow-sm">
          <div className="flex items-center gap-3 text-purple-900">
            <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-[16px]">{pendingReviewCount} Features waiting review</h3>
              <p className="text-sm text-purple-700">These features have been cloned or drafted and require approval.</p>
            </div>
          </div>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:scale-[1.05] active:scale-[0.98] transition-all duration-200">
            Review Now
          </button>
        </div>
      )}

      {/* Data Table Area */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] overflow-hidden">
        <FeatureDataTable />
      </div>
    </div>
  );
}
