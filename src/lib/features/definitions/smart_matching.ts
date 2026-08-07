import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'smart_matching',
  version: '1.0.0',
  name: 'Smart Matching',
  description: 'Akıllı eşleştirme ve sosyal özellikler.',
  category: 'social',
  icon: 'heart',
  visibility: 'public',
  
  tags: ['social', 'match'],
  metadata: {}, display_order: 100, state: 'ACTIVE', dependsOn: [], requiresAuth: true, requiresPet: true,
};
