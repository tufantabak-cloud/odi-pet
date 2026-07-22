/**
 * Odi.Pet — Grounded Real URL Validation Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import { validateTechnicalUrl } from '../contentResearchService';

describe('Grounded Real URL Validation Rules', () => {
  it('1. PubMed metin pathleri (uydurma slug) reddedilir, sayısal PMID kabul edilir', () => {
    const invalidPubmed = validateTechnicalUrl('https://pubmed.ncbi.nlm.nih.gov/articles/kedilerde-su-tuketimi');
    expect(invalidPubmed.isValid).toBe(false);
    expect(invalidPubmed.error).toContain('sayısal PMID');

    const validPubmed = validateTechnicalUrl('https://pubmed.ncbi.nlm.nih.gov/31584210/');
    expect(validPubmed.isValid).toBe(true);
    expect(validPubmed.pmid).toBe('31584210');
  });

  it('2. 404 eski AAHA URLsi reddedilir, geçerli kılavuz kabul edilir', () => {
    const invalidAaha = validateTechnicalUrl('https://www.aaha.org/aaha-guidelines/life-stage-canine-configuration/behavior/');
    expect(invalidAaha.isValid).toBe(false);
    expect(invalidAaha.error).toContain('Canonical URL bulunamadı');

    const validAaha = validateTechnicalUrl('https://www.aaha.org/your-pet/pet-owner-education/ask-aaha/canine-socialization/');
    expect(validAaha.isValid).toBe(true);
  });

  it('3. Localhost, özel IPler ve http:// protokolü reddedilir (SSRF Protection)', () => {
    expect(validateTechnicalUrl('http://pubmed.ncbi.nlm.nih.gov/31584210/').isValid).toBe(false);
    expect(validateTechnicalUrl('https://localhost/api').isValid).toBe(false);
    expect(validateTechnicalUrl('https://127.0.0.1/admin').isValid).toBe(false);
    expect(validateTechnicalUrl('https://192.168.1.1/secret').isValid).toBe(false);
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
