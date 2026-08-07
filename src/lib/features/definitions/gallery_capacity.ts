import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'gallery_capacity',
  version: '1.0.0',
  name: 'Gallery Capacity',
  description: 'Pet galeri fotoğraf yükleme kapasitesi limiti.',
  category: 'core',
  icon: 'image',
  visibility: 'public',
  
  tags: ['gallery', 'limit'],
  metadata: {}, display_order: 100, state: 'ACTIVE', dependsOn: [], requiresAuth: true, requiresPet: false,
};
