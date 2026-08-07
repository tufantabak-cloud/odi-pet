import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'breeding_listings',
  version: '1.0.0',
  name: 'Çiftleştirme İlan Yönetimi',
  description: 'Çiftleştirme ilanı oluşturma, yönetme ve başvuru takibi.',
  category: 'social',
  icon: 'megaphone',
  visibility: 'public',
  tags: ['breeding', 'social', 'premium'],
  metadata: {},
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: true,
};
