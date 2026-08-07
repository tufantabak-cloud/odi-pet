import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'budget_tracking',
  version: '1.0.0',
  name: 'Bütçe & Harcama Takibi',
  description: 'Evcil hayvan harcamalarını kaydetme ve son 30 gün listeleme.',
  category: 'core',
  icon: 'wallet',
  visibility: 'public',
  tags: ['budget', 'finance'],
  metadata: {},
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: false,
};
