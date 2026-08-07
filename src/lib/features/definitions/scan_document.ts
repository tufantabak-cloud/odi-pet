import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'scan_document',
  version: '1.0.0',
  name: 'Belge Tarayıcı (OCR)',
  description: 'Gemini Vision ile pasaport, aşı kartı, mama paketi ve ilaç kutusu tarama.',
  category: 'ai',
  icon: 'scan',
  visibility: 'public',
  tags: ['ai', 'ocr', 'premium'],
  metadata: {},
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: false,
};
