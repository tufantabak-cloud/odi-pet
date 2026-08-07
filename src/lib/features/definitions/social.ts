import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'social_adoption',
  version: '1.0.0',
  name: 'Social Adoption',
  description: 'Connect with local shelters and browse pets available for adoption.',
  category: 'social',
  icon: 'users',
  visibility: 'public',
  
  tags: ['social', 'community'],
  metadata: {}, display_order: 100, state: 'ACTIVE', dependsOn: [], requiresAuth: true, requiresPet: false,
};
