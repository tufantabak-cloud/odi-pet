import type { FeatureDefinition } from '../types';

export const feature: FeatureDefinition = {
  key: 'ai_vet',
  version: '1.0.0',
  name: 'AI Vet Assistant',
  description: 'AI-powered veterinary symptom analysis and health suggestions for your pet.',
  category: 'ai',
  icon: 'bot',
  visibility: 'public',
  
  tags: ['health', 'ai', 'premium'],
  metadata: {
    model: 'gpt-4',
    maxTokens: 2000
  },
  display_order: 100,
  state: 'ACTIVE',
  dependsOn: [],
  requiresAuth: true,
  requiresPet: false
};
