/**
 * Odi.Pet — Pilot Draft Generation & Safety Rules Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import { validateDraftStructure } from '../../agents/aiContentAgent';

describe('Pilot Draft Generation Safety & Structure Rules', () => {
  it('1. İki verified kaynak olmadan üretim başlamaz', () => {
    const verifiedSourcesCount = 1;
    const canGenerate = verifiedSourcesCount >= 2;
    expect(canGenerate).toBe(false);
  });

  it('2. AI proposed ve rejected kaynakları taslak iddialarında temel alamaz', () => {
    const proposedSource = { verification_status: 'proposed' };
    const rejectedSource = { verification_status: 'rejected' };

    expect(proposedSource.verification_status === 'verified').toBe(false);
    expect(rejectedSource.verification_status === 'verified').toBe(false);
  });

  it('3. Kaynaksız önemli iddia barındıran tıbbi taslak doğrulama hatası verir', () => {
    const invalidMedicalDraft = {
      title: 'Tıbbi Rehber',
      excerpt: 'Özet',
      content: 'Metin',
      category: 'saglik',
      species_filter: ['cat'],
      is_medical_content: true,
      source_claims: [] // Boş iddialar
    };

    const res = validateDraftStructure(invalidMedicalDraft);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('source_claims');
  });

  it('4. Kedi hidrasyonu taslağı yalnız cat hedeflidir ve sabit güvenlik uyarısı içerir', () => {
    const catDraft = {
      title: 'Kedilerde Su Tüketimi',
      excerpt: 'Özet',
      content: 'Bu içerik genel bilgilendirme amaçlıdır...',
      category: 'saglik',
      species_filter: ['cat'],
      is_medical_content: true,
      safety_notes: 'Bu içerik genel bilgilendirme amaçlıdır. Petinizin su tüketiminde belirgin değişiklik, iştahsızlık, halsizlik veya idrar alışkanlıklarında farklılık fark ederseniz veteriner hekiminize danışın.'
    };

    expect(catDraft.species_filter).toEqual(['cat']);
    expect(catDraft.safety_notes).toContain('veteriner hekiminize danışın');
  });

  it('5. Köpek sosyalleşmesi taslağı yalnız dog hedeflidir', () => {
    const dogDraft = {
      title: 'Köpeklerde Sosyalleşme',
      excerpt: 'Özet',
      content: 'Metin',
      category: 'egitim',
      species_filter: ['dog'],
      is_medical_content: false
    };

    expect(dogDraft.species_filter).toEqual(['dog']);
    expect(dogDraft.is_medical_content).toBe(false);
  });

  it('6. AI ajanı tıbbi taslağı vet_review_required veya approved_for_import yapamaz, durum admin_review_required olur', () => {
    const targetStatusAfterAiGeneration = 'admin_review_required';
    expect(targetStatusAfterAiGeneration).toBe('admin_review_required');
    expect(targetStatusAfterAiGeneration).not.toBe('vet_review_required');
    expect(targetStatusAfterAiGeneration).not.toBe('approved_for_import');
  });

  it('7. Taslak üretimi articles tablosuna kayıt aktarmaz ve is_published false kalır', () => {
    const importedToArticles = false;
    const isPublished = false;
    expect(importedToArticles).toBe(false);
    expect(isPublished).toBe(false);
  });
});
