import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'insurance_readiness',
  version: '1.0.0',
  name: 'Insurance Readiness',
  description: 'Sigorta uyumluluk ve sağlık skoru hesaplamaları.',
  category: 'health',
  icon: 'shield',
  visibility: 'public',
  
  tags: ['insurance', 'health'],
  metadata: {}, display_order: 100, state: 'ACTIVE', dependsOn: [], requiresAuth: true, requiresPet: true,
};
