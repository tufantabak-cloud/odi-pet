import React from 'react';
import { UseFeatureReturn } from '../../lib/features/hooks';
import { FeatureAccessReason } from '../../lib/features/entitlement/types';

export interface PremiumContentProps {
  featureState: UseFeatureReturn;
  onUpgrade?: () => void;
  featureName?: string;
}

/**
 * OPOS compliant generic premium content module.
 * Designed to be rendered inside `Modal` or as an inline fallback.
 */
export function PremiumContent({ featureState, onUpgrade, featureName }: PremiumContentProps) {
  const { reason, remaining, limit, upgradePlan } = featureState;

  let title = 'Premium Özellik';
  let description = 'Bu özelliği kullanmak için lütfen planınızı yükseltin.';

  let showButton = true;
  let icon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  if (featureState.state === 'COMING_SOON') {
    title = 'Çok Yakında!';
    description = `Bu ${featureName ? `(${featureName}) ` : ''}özellik şu an geliştirme aşamasındadır. Çok yakında Odi.Pet'te sizlerle olacak.`;
    showButton = false;
    icon = (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    );
  } else if (featureState.state === 'DISABLED') {
    title = 'Bakımda';
    description = `Bu özellik geçici olarak devre dışı bırakılmıştır.`;
    showButton = false;
  } else if (reason === FeatureAccessReason.USAGE_LIMIT_REACHED) {
    title = 'Kotanız Doldu';
    description = `Bu ${featureName ? `(${featureName}) ` : ''}özellik için aylık ${limit} kullanım kotanızı doldurdunuz. Sınırsız veya daha yüksek kotalı bir plana geçiş yapın.`;
  } else if (reason === FeatureAccessReason.TIER_REQUIRED || reason === FeatureAccessReason.BUNDLE_DISABLED) {
    title = `${upgradePlan || 'Premium'} Plan Gerekiyor`;
    description = `Bu özellik mevcut planınıza dahil değildir. Erişmek için ${upgradePlan ? upgradePlan.toUpperCase() : 'Premium'} paketine geçin.`;
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-2">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-text-primary">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
        {description}
      </p>
      
      {showButton && (
        <button 
          onClick={onUpgrade}
          className="mt-4 w-full h-11 bg-primary text-white font-bold rounded-2xl active:scale-[0.98] transition-all hover:scale-[1.02] shadow-sm flex justify-center items-center"
        >
          Planı Yükselt
        </button>
      )}
    </div>
  );
}
