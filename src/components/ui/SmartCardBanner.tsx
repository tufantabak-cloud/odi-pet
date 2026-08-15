import React, { ReactNode } from 'react';

interface SmartCardBannerProps {
  title: string;
  description: string;
  icon: ReactNode;
  onAction: () => void;
  actionLabel: string;
  colorTheme?: 'purple' | 'orange' | 'blue' | 'green';
}

export default function SmartCardBanner({
  title,
  description,
  icon,
  onAction,
  actionLabel,
  colorTheme = 'purple'
}: SmartCardBannerProps) {
  const themeGradients = {
    purple: 'from-purple-50 to-white border-purple-100',
    orange: 'from-orange-50 to-white border-orange-100',
    blue: 'from-blue-50 to-white border-blue-100',
    green: 'from-green-50 to-white border-green-100'
  };
  
  const iconColors = {
    purple: 'text-purple-600 bg-purple-100/50',
    orange: 'text-orange-600 bg-orange-100/50',
    blue: 'text-blue-600 bg-blue-100/50',
    green: 'text-green-600 bg-green-100/50'
  };

  const btnColors = {
    purple: 'bg-purple-600 hover:bg-purple-700 text-white',
    orange: 'bg-orange-600 hover:bg-orange-700 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white'
  };

  const gradient = themeGradients[colorTheme] || themeGradients.purple;
  const iconColor = iconColors[colorTheme] || iconColors.purple;
  const btnColor = btnColors[colorTheme] || btnColors.purple;

  return (
    <div className={`w-full rounded-[24px] border ${gradient} bg-gradient-to-r p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]`}>
      <div className="flex items-start sm:items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
      </div>
      <button 
        onClick={onAction}
        className={`shrink-0 px-5 py-2.5 rounded-[16px] font-semibold text-sm transition-all active:scale-[0.98] ${btnColor}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
