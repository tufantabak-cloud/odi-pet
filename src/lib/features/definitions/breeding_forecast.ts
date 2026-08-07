import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'breeding_forecast',
  version: '1.0.0',
  name: 'Üreme & Kızgınlık Tahmini',
  description: 'Kızgınlık döngüsü takibi ve AI destekli üreme takvimi tahmini.',
  category: 'health',
  icon: 'heart-pulse',
  visibility: 'public',
  tags: ['breeding', 'health', 'premium'],
  metadata: {},
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: true,
};
