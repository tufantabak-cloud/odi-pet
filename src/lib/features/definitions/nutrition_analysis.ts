import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'nutrition_analysis',
  version: '1.0.0',
  name: 'Nutrition Analysis',
  description: 'AI destekli beslenme ve mama analizi.',
  category: 'ai',
  icon: 'activity',
  visibility: 'public',
  
  tags: ['nutrition', 'health'],
  metadata: {}, display_order: 100, state: 'ACTIVE', dependsOn: [], requiresAuth: true, requiresPet: true,
};
