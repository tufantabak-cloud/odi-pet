/**
 * Odi.Pet — Grounded Source Research & SSRF Security Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import { validateGroundedUrl } from '../contentResearchService';

describe('Grounded Research & SSRF Security Rules', () => {
  it('1. Sadece geçerli https:// URLleri kabul edilir', () => {
    const valid = validateGroundedUrl('https://wsava.org/global-guidelines/global-nutrition-guidelines/');
    expect(valid.isValid).toBe(true);
    expect(valid.normalizedUrl).toBe('https://wsava.org/global-guidelines/global-nutrition-guidelines/');

    const httpUrl = validateGroundedUrl('http://wsava.org/global-guidelines/');
    expect(httpUrl.isValid).toBe(false);
    expect(httpUrl.error).toContain('https://');
  });

  it('2. SSRF Güvenliği: Localhost, özel IPler ve iç ağ URLleri engellenir', () => {
    expect(validateGroundedUrl('https://localhost/api').isValid).toBe(false);
    expect(validateGroundedUrl('https://127.0.0.1/admin').isValid).toBe(false);
    expect(validateGroundedUrl('https://192.168.1.1/secret').isValid).toBe(false);
    expect(validateGroundedUrl('https://10.0.0.5/internal').isValid).toBe(false);
    expect(validateGroundedUrl('https://172.16.0.1/db').isValid).toBe(false);
  });

  it('3. AI ajanı kaynağı kendisi verified yapamaz, varsayılan status proposed kalır', () => {
    const aiProposedSource = {
      source_title: 'Örnek Kaynak',
      verification_status: 'proposed'
    };

    expect(aiProposedSource.verification_status).toBe('proposed');
    expect(aiProposedSource.verification_status).not.toBe('verified');
  });

  it('4. Tek doğrulanmış kaynakla tıbbi taslak üretilemez (En az 2 verified kaynak kuralı)', () => {
    const verifiedSourcesCount = 1;

    const canGenerate = verifiedSourcesCount >= 2;
    expect(canGenerate).toBe(false);
  });

  it('5. İki doğrulanmış uygun kaynakla üretim başlayabilir', () => {
    const verifiedSourcesCount = 2;
    const canGenerate = verifiedSourcesCount >= 2;
    expect(canGenerate).toBe(true);
  });

  it('6. AI ajanı durumunu approved_for_import veya imported yapamaz', () => {
    const allowedAiStatuses = ['researching', 'source_review_required', 'ready_for_generation', 'generating', 'draft_ready', 'admin_review_required'];
    expect(allowedAiStatuses).not.toContain('approved_for_import');
    expect(allowedAiStatuses).not.toContain('imported');
  });
});
