import React from 'react';

type ConfidenceLevel = 'none' | 'low' | 'medium';

interface ForecastConfidenceBadgeProps {
  level: ConfidenceLevel;
}

export function ForecastConfidenceBadge({ level }: ForecastConfidenceBadgeProps) {
  let text = 'Henüz hesaplanamıyor';
  let badgeStyle = 'bg-gray-100 text-gray-500 border border-gray-200';
  let shadowStyle = '';
  
  if (level === 'low') {
    text = 'Sınırlı kayıtla tahmin';
    badgeStyle = 'bg-gradient-to-r from-pink-50 to-purple-50 text-purple-700 border border-purple-200';
    shadowStyle = 'drop-shadow-sm';
  } else if (level === 'medium') {
    text = 'Kişisel geçmişe dayalı tahmin';
    badgeStyle = 'bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 border border-indigo-200';
    shadowStyle = 'drop-shadow-sm';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap text-center ${badgeStyle} ${shadowStyle}`}>
      {text}
    </span>
  );
}
