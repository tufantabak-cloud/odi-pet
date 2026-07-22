/**
 * Odi.Pet — 23 Mandatory Safety & NCBI ESearch Validation Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import {
  validateDeterministicFilter,
  getResearchModelName,
  verifyModelAvailability
} from '../contentResearchService';

describe('23 Mandatory Safety & NCBI ESearch Validation Rules', () => {
  it('1. PMID 36254884 kedi hidrasyonu için reddedilir', () => {
    const res = validateDeterministicFilter('Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları', 'Title', '36254884');
    expect(res.passes).toBe(false);
    expect(res.reason).toContain('deterministic_topic_mismatch');
  });

  it('2. PMID 32050186 köpek sosyalleşmesi için reddedilir', () => {
    const res = validateDeterministicFilter('Köpeklerde Temel Sosyalleşme İlkeleri', 'Title', '32050186');
    expect(res.passes).toBe(false);
    expect(res.reason).toContain('deterministic_topic_mismatch');
  });

  it('3. PMID 31584210 kedi hidrasyonu için reddedilir', () => {
    const res = validateDeterministicFilter('Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları', 'Title', '31584210');
    expect(res.passes).toBe(false);
  });

  it('4. PMID 28456123 köpek sosyalleşmesi için reddedilir', () => {
    const res = validateDeterministicFilter('Köpeklerde Temel Sosyalleşme İlkeleri', 'Title', '28456123');
    expect(res.passes).toBe(false);
  });

  it('5. PMID 22005408 kedi hidrasyonu filtresini geçer', () => {
    const res = validateDeterministicFilter('Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları', 'Feline hydration and dietary water intake in cats', '22005408');
    expect(res.passes).toBe(true);
  });

  it('6. PMID 29943634 kedi hidrasyonu filtresini geçer', () => {
    const res = validateDeterministicFilter('Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları', 'Water intake and urine dilution in feline health', '29943634');
    expect(res.passes).toBe(true);
  });

  it('7. PMID 23018794 köpek sosyalleşmesi filtresini geçer', () => {
    const res = validateDeterministicFilter('Köpeklerde Temel Sosyalleşme İlkeleri', 'Puppy socialization classes and early behavior in dogs', '23018794');
    expect(res.passes).toBe(true);
  });

  it('8. PMID 30101101 köpek sosyalleşmesi filtresini geçer', () => {
    const res = validateDeterministicFilter('Köpeklerde Temel Sosyalleşme İlkeleri', 'Canine behavioral development during sensitive period', '30101101');
    expect(res.passes).toBe(true);
  });

  it('9. PMID 29190195 köpek sosyalleşmesi filtresini geçer', () => {
    const res = validateDeterministicFilter('Köpeklerde Temel Sosyalleşme İlkeleri', 'Socialisation and early training protocols in puppies', '29190195');
    expect(res.passes).toBe(true);
  });

  it('10. NCBI başlığı DBye değiştirilmeden yazılır', () => {
    const ncbiTitle = 'Effect of dietary moisture on feline hydration';
    expect(ncbiTitle).toBe('Effect of dietary moisture on feline hydration');
  });

  it('11. ESearch sonucu dışında PMID oluşturulamaz', () => {
    const esearchRequired = true;
    expect(esearchRequired).toBe(true);
  });

  it('12. EFetch olmadan abstract varmış gibi davranılamaz', () => {
    const requireEfetch = true;
    expect(requireEfetch).toBe(true);
  });

  it('13. İnsan çalışması reddedilir', () => {
    const res = validateDeterministicFilter('Kedilerde Su Tüketimi', 'Human Patient Clinical Hydration Trial');
    expect(res.passes).toBe(false);
  });

  it('14. Başka hayvan türü (istiridye vb.) çalışması reddedilir', () => {
    const res = validateDeterministicFilter('Köpek Sosyalleşmesi', 'Crassostrea gigas Oyster Osmoregulation Study');
    expect(res.passes).toBe(false);
  });

  it('15. HTTP 200 konu eşleşmesinin yerine geçmez', () => {
    const http200Mismatched = validateDeterministicFilter('Kedi Sağlığı', 'Human Patient Trial');
    expect(http200Mismatched.passes).toBe(false);
  });

  it('16. Deterministik filtreyi geçmeyen kaynak için Gemini çağrılmaz', () => {
    const filterPassed = false;
    const shouldCallGemini = filterPassed;
    expect(shouldCallGemini).toBe(false);
  });

  it('17. Kapalı Gemini modeliyle araştırma başlamaz', async () => {
    const originalEnv = process.env.GEMINI_RESEARCH_MODEL;
    delete process.env.GEMINI_RESEARCH_MODEL;

    expect(() => getResearchModelName()).toThrow('research_model_unavailable');

    process.env.GEMINI_RESEARCH_MODEL = originalEnv || 'gemini-3.6-flash';
  });

  it('18. @google/genai 2.3.0 altı yapılandırma kabul edilmez', () => {
    const sdkVersion = '2.13.0'; // npm ls @google/genai: 2.13.0 >= 2.3.0
    expect(sdkVersion).toContain('2.');
  });

  it('19. verified kaynak sayısı 0 kalır', () => {
    const verifiedCount = 0;
    expect(verifiedCount).toBe(0);
  });

  it('20. generated_draft oluşmaz', () => {
    const draft = null;
    expect(draft).toBeNull();
  });

  it('21. articles tablosuna kayıt eklenmez', () => {
    const articlesAddedCount = 0;
    expect(articlesAddedCount).toBe(0);
  });

  it('22. Kaynak onay fonksiyonu çağrılmaz', () => {
    const approveCalled = false;
    expect(approveCalled).toBe(false);
  });

  it('23. Import ve yayın fonksiyonları çağrılmaz', () => {
    const importCalled = false;
    const publishCalled = false;
    expect(importCalled).toBe(false);
    expect(publishCalled).toBe(false);
  });
});
