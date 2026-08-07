import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'pdf_export',
  version: '1.0.0',
  name: 'PDF & Rapor Dışa Aktarma',
  description: 'Sağlık özeti, medikal zaman çizelgesi ve seyahat paketi PDF dışa aktarma.',
  category: 'reports',
  icon: 'file-text',
  visibility: 'public',
  tags: ['export', 'records', 'premium'],
  metadata: {},
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: true,
};
