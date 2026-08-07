'use client';
import React from 'react';
import { BarChart3, Activity, Clock, Users } from 'lucide-react';

export default function AnalyticsDashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feature Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time usage metrics, latency tracking, and quota hits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col gap-2">
          <div className="text-slate-500 text-sm font-medium flex items-center gap-2"><Activity size={16}/> Total Consumes</div>
          <div className="text-3xl font-black text-slate-900">12,450</div>
          <div className="text-xs text-green-500 font-bold">+14% vs last week</div>
        </div>
        
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col gap-2">
          <div className="text-slate-500 text-sm font-medium flex items-center gap-2"><Clock size={16}/> Avg Latency (P95)</div>
          <div className="text-3xl font-black text-slate-900">42ms</div>
          <div className="text-xs text-green-500 font-bold">-5ms vs last week</div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col gap-2">
          <div className="text-slate-500 text-sm font-medium flex items-center gap-2"><BarChart3 size={16}/> Quota Hits (Denials)</div>
          <div className="text-3xl font-black text-slate-900">184</div>
          <div className="text-xs text-red-500 font-bold">+2% vs last week</div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col gap-2">
          <div className="text-slate-500 text-sm font-medium flex items-center gap-2"><Users size={16}/> Upgrade Clicks</div>
          <div className="text-3xl font-black text-slate-900">42</div>
          <div className="text-xs text-green-500 font-bold">+22% vs last week</div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden mt-4">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Top Consumed Features</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">Feature</th>
              <th className="p-4 font-medium">Consumes</th>
              <th className="p-4 font-medium">Avg Latency</th>
              <th className="p-4 font-medium">Quota Hit Rate</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="p-4 font-semibold text-slate-900">ai_vet</td>
              <td className="p-4 text-slate-600">5,230</td>
              <td className="p-4 text-slate-600">1.2s</td>
              <td className="p-4 text-red-600">4.2%</td>
            </tr>
            <tr className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="p-4 font-semibold text-slate-900">scan_document</td>
              <td className="p-4 text-slate-600">3,100</td>
              <td className="p-4 text-slate-600">2.4s</td>
              <td className="p-4 text-red-600">1.1%</td>
            </tr>
            <tr className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="p-4 font-semibold text-slate-900">budget_tracking</td>
              <td className="p-4 text-slate-600">2,850</td>
              <td className="p-4 text-slate-600">45ms</td>
              <td className="p-4 text-green-600">0.0%</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="p-4 font-semibold text-slate-900">breeding_forecast</td>
              <td className="p-4 text-slate-600">1,270</td>
              <td className="p-4 text-slate-600">120ms</td>
              <td className="p-4 text-red-600">8.5%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
