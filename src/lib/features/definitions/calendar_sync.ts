import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'calendar_sync',
  version: '1.0.0',
  name: 'Takvim Senkronizasyonu',
  description: 'iCal ile harici takvim uygulamalarına otomatik senkronizasyon.',
  category: 'core',
  icon: 'calendar-check',
  visibility: 'public',
  tags: ['calendar', 'sync', 'premium'],
  metadata: {},
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: false,
};
