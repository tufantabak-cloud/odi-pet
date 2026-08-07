import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'budget_export',
  version: '1.0.0',
  name: 'Bütçe Dışa Aktarma',
  description: 'Harcama verilerini CSV veya PDF olarak dışa aktarma.',
  category: 'reports',
  icon: 'download',
  visibility: 'public',
  tags: ['budget', 'export', 'premium'],
  metadata: {},
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: false,
};
