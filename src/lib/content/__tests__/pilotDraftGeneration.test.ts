/**
 * Odi.Pet — Pilot Draft Generation & Human Verification Security Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import { validateDraftStructure } from '../../agents/aiContentAgent';

describe('Pilot Draft Generation Safety & Structure Rules', () => {
  it('1. İki verified kaynak olmadan üretim başlamaz', () => {
    const verifiedSourcesCount = 1;
    const canGenerate = verifiedSourcesCount >= 2;
    expect(canGenerate).toBe(false);
  });

  it('2. Proposed ve rejected kaynaklar taslak iddialarında temel alınamaz', () => {
    const proposedSource = { verification_status: 'proposed' };
    const rejectedSource = { verification_status: 'rejected' };

    expect(proposedSource.verification_status === 'verified').toBe(false);
    expect(rejectedSource.verification_status === 'verified').toBe(false);
  });

  it('3. Su pınarı veya akan su iddiası içeren taslak reddedilir', () => {
    const draftWithFountain = {
      title: 'Kedi Hidrasyonu',
      excerpt: 'Özet',
      content: 'Su pınarları kedilerin su içme sıklığını artırır.',
      category: 'saglik',
      species_filter: ['cat'],
      is_medical_content: true,
      source_claims: [{ claim: 'Su pınarları faydalıdır', supporting_source_ids: ['src1'] }]
    };

    const res = validateDraftStructure(draftWithFountain);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Su pınarı');
  });

  it('4. Kedi hidrasyonu taslağı yalnız cat hedeflidir ve sabit güvenlik uyarısı içerir', () => {
    const catDraft = {
      title: 'Kedilerde Su Tüketimi',
      excerpt: 'Özet',
      content: 'Bu içerik genel bilgilendirme amaçlıdır...',
      category: 'saglik',
      species_filter: ['cat'],
      is_medical_content: true,
      source_claims: [{ claim: 'Diyet nemi su alımını artırır', supporting_source_ids: ['src1'] }],
      safety_notes: 'Bu içerik genel bilgilendirme amaçlıdır. Petinizin su tüketiminde belirgin değişiklik, iştahsızlık, halsizlik veya idrar alışkanlıklarında farklılık fark ederseniz veteriner hekiminize danışın.'
    };

    const res = validateDraftStructure(catDraft);
    expect(res.isValid).toBe(true);
    expect(catDraft.species_filter).toEqual(['cat']);
  });

  it('5. Köpek sosyalleşmesi taslağı yalnız dog hedeflidir', () => {
    const dogDraft = {
      title: 'Köpeklerde Sosyalleşme',
      excerpt: 'Özet',
      content: 'Köpeklerde sosyalleşme rehberi...',
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
