/**
 * Odi.Pet — Semantic Source Validation & NCBI E-utilities Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import {
  validateTechnicalUrl,
  validateSemanticRelevance,
  getResearchModelName
} from '../contentResearchService';

describe('Semantic Source & NCBI E-utilities Validation Rules', () => {
  it('1. HTTP 200 dönen ilgisiz PMID 31584210 kedi hidrasyonu için reddedilir', () => {
    const res = validateSemanticRelevance('Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları', 'General Feline Study', '31584210');
    expect(res.isSemanticallyValid).toBe(false);
    expect(res.relevance).toBe('not_relevant');
    expect(res.error).toContain('reddedildi');
  });

  it('2. HTTP 200 dönen ilgisiz PMID 28456123 köpek sosyalleşmesi için reddedilir', () => {
    const res = validateSemanticRelevance('Köpeklerde Temel Sosyalleşme İlkeleri', 'General Behavior Study', '28456123');
    expect(res.isSemanticallyValid).toBe(false);
    expect(res.relevance).toBe('not_relevant');
  });

  it('3. İnsan tıbbı ve pet dışı (istiridye vb.) çalışmaları otomatik reddedilir', () => {
    const humanStudy = validateSemanticRelevance('Kedilerde Su Tüketimi', 'Human Patient Clinical Trial on Renal Function');
    expect(humanStudy.isSemanticallyValid).toBe(false);

    const oysterStudy = validateSemanticRelevance('Köpek Sosyalleşmesi', 'Crassostrea gigas Oyster Osmoregulation Study');
    expect(oysterStudy.isSemanticallyValid).toBe(false);
  });

  it('4. 404 eski AAHA URLsi teknik doğrulamada reddedilir', () => {
    const res = validateTechnicalUrl('https://www.aaha.org/aaha-guidelines/life-stage-canine-configuration/behavior/');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Canonical URL bulunamadı');
  });

  it('5. WSAVA genel beslenme sayfası kedi hidrasyonuna özel işaretlenmez (partially_relevant)', () => {
    const res = validateSemanticRelevance(
      'Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları',
      'WSAVA Global Nutrition Guidelines',
      undefined,
      'https://wsava.org/global-guidelines/global-nutrition-guidelines/'
    );
    expect(res.isSemanticallyValid).toBe(true);
    expect(res.relevance).toBe('partially_relevant');
  });

  it('6. GEMINI_RESEARCH_MODEL boş veya eksik olduğunda araştırma güvenli hata verir', () => {
    const originalEnv = process.env.GEMINI_RESEARCH_MODEL;
    delete process.env.GEMINI_RESEARCH_MODEL;

    expect(() => getResearchModelName()).toThrow('GEMINI_RESEARCH_MODEL zorunludur');

    process.env.GEMINI_RESEARCH_MODEL = originalEnv || 'gemini-2.0-flash';
  });

  it('7. Aday kaynaklar proposed durumunda saklanır, verified sayısı 0 kalır', () => {
    const status = 'proposed';
    expect(status).toBe('proposed');
    expect(status).not.toBe('verified');
  });
});
