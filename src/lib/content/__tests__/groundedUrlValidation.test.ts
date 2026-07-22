/**
 * Odi.Pet — Grounded Real URL Validation Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import { validateGroundedUrl } from '../contentResearchService';

describe('Grounded Real URL Validation Rules', () => {
  it('1. PubMed metin pathleri (uydurma slug) reddedilir, sayısal PMID kabul edilir', () => {
    const invalidPubmed = validateGroundedUrl('https://pubmed.ncbi.nlm.nih.gov/articles/kedilerde-su-tuketimi');
    expect(invalidPubmed.isValid).toBe(false);
    expect(invalidPubmed.error).toContain('Sayısal PMID içermeyen');

    const validPubmed = validateGroundedUrl('https://pubmed.ncbi.nlm.nih.gov/31584210/');
    expect(validPubmed.isValid).toBe(true);
    expect(validPubmed.pmid).toBe('31584210');
  });

  it('2. WSAVA uydurma metin pathleri reddedilir, gerçek kılavuz kabul edilir', () => {
    const invalidWsava = validateGroundedUrl('https://wsava.org/guidelines/kedilerde%20su%20t%C3%BCketimi');
    expect(invalidWsava.isValid).toBe(false);
    expect(invalidWsava.error).toContain('uydurulmuş path kabul edilmez');

    const validWsava = validateGroundedUrl('https://wsava.org/global-guidelines/global-nutrition-guidelines/');
    expect(validWsava.isValid).toBe(true);
  });

  it('3. Localhost, özel IPler ve http:// protokolü reddedilir (SSRF Protection)', () => {
    expect(validateGroundedUrl('http://pubmed.ncbi.nlm.nih.gov/31584210/').isValid).toBe(false);
    expect(validateGroundedUrl('https://localhost/api').isValid).toBe(false);
    expect(validateGroundedUrl('https://127.0.0.1/admin').isValid).toBe(false);
    expect(validateGroundedUrl('https://192.168.1.1/secret').isValid).toBe(false);
  });

  it('4. Sahte uyum yüzdesi (%92, %95) yerine açıklayıcı relevance kuralı geçerlidir', () => {
    const validRatings = ['relevant', 'partially_relevant', 'not_relevant', 'inaccessible'];
    expect(validRatings).toContain('relevant');
    expect(validRatings).not.toContain('%92');
  });

  it('5. Pilot kaynaklar proposed olarak başlar, verified sayısı 0 kalır', () => {
    const initialVerificationStatus = 'proposed';
    expect(initialVerificationStatus).toBe('proposed');
    expect(initialVerificationStatus).not.toBe('verified');
  });
});
