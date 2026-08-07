import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'budget_analytics',
  version: '1.0.0',
  name: 'Bütçe Analitik & Trendler',
  description: 'Harcama grafikleri, kategori analizi, trendler ve sınırsız geçmiş.',
  category: 'reports',
  icon: 'bar-chart-3',
  visibility: 'public',
  tags: ['budget', 'analytics', 'premium'],
  metadata: {},
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: false,
};
