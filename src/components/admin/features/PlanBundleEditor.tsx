'use client';

import React, { useState } from 'react';
import { Crown, Check } from 'lucide-react';

interface Feature {
  key: string;
  name: string;
  category: string;
}

interface PlanBundleEditorProps {
  plans: string[];
  features: Feature[];
}

export function PlanBundleEditor({ plans, features }: PlanBundleEditorProps) {
  // Mock state since we don't have DB tables ready for bundles in props yet.
  // In a real scenario, this would be initialized from `plan_bundles` and `bundle_features`.
  const [selectedPlan, setSelectedPlan] = useState<string>(plans[0] || '');
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());

  const toggleFeature = (featureKey: string) => {
    setSelectedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureKey)) {
        next.delete(featureKey);
      } else {
        next.add(featureKey);
      }
      return next;
    });
  };

  const handleSave = () => {
    alert(`${selectedPlan} planı için bundle başarıyla güncellendi!`);
  };

  const categories = Array.from(new Set(features.map(f => f.category)));

  if (plans.length === 0) return null;

  return (
    <div className="card-base p-6 bg-white border border-slate-100 rounded-3xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Plan Bundle (Paket) Editörü
          </h3>
          <p className="text-xs text-slate-500">
            Hangi planın hangi özelliklere (erişime) sahip olduğunu belirleyin. Kotalar için Matrix sekmesini kullanın.
          </p>
        </div>
        <button 
          onClick={handleSave}
          className="btn-primary py-2 px-4 rounded-xl text-xs font-bold active:scale-95 transition-transform"
        >
          Paketi Kaydet
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
        {plans.map(plan => (
          <button
            key={plan}
            onClick={() => setSelectedPlan(plan)}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all uppercase ${
              selectedPlan === plan 
                ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent'
            }`}
          >
            {plan}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => (
          <div key={category} className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
              {category}
            </h4>
            <div className="space-y-2">
              {features.filter(f => f.category === category).map(feature => {
                const isSelected = selectedFeatures.has(feature.key);
                return (
                  <div 
                    key={feature.key}
                    onClick={() => toggleFeature(feature.key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected ? 'bg-primary border-primary text-white' : 'bg-white border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {feature.name}
                      </div>
                      <div className="text-2xs text-slate-400 font-mono mt-0.5">{feature.key}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
