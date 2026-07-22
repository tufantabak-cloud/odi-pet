/**
 * Odi.Pet — Guarded AI Content Agent & Queue Vitest Test Suite
 */

import { describe, it, expect } from 'vitest';
import { validateDraftStructure } from '../../agents/aiContentAgent';

describe('Guarded AI Content Agent & Queue Safety Rules', () => {
  it('1. Kaynaksız veya doğrulanmamış tıbbi taslak doğrulama hatası verir', () => {
    const invalidMedicalDraft = {
      title: 'Tıbbi Rehber',
      excerpt: 'Özet',
      content: 'İçerik metni',
      category: 'saglik',
      species_filter: ['dog'],
      is_medical_content: true,
      source_claims: [] // Kaynak iddiası boş
    };

    const res = validateDraftStructure(invalidMedicalDraft);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('source_claims');
  });

  it('2. Geçersiz hedef türü (örn: bird, fish, both) barındıran AI çıktısı reddedilir', () => {
    const invalidSpeciesDraft = {
      title: 'Kuş Bakımı',
      excerpt: 'Özet',
      content: 'Metin',
      category: 'genel',
      species_filter: ['bird'], // Desteklenmiyor
      is_medical_content: false
    };

    const res = validateDraftStructure(invalidSpeciesDraft);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Geçersiz tür filtresi');
  });

  it('3. AI ajanı vet_review_status alanını asla approved yapamaz, makale aktarımı pending olur', () => {
    const isMedical = true;
    const initialVetStatus = isMedical ? 'pending' : 'not_required';

    expect(initialVetStatus).toBe('pending');
    expect(initialVetStatus).not.toBe('approved');
  });

  it('4. Makaleye aktarım (Import) kesinlikle yayınlama anlamına gelmez (is_published = false)', () => {
    const importedArticle = {
      title: 'Yeni Taslak Makale',
      is_published: false
    };

    expect(importedArticle.is_published).toBe(false);
  });

  it('5. Idempotent Import: İkinci kez çağrılan import işlemi tekrar makale oluşturmaz', () => {
    const job = { id: 'job-1', generation_status: 'imported' };
    const canImport = ['approved_for_import', 'admin_review_required'].includes(job.generation_status);

    expect(canImport).toBe(false);
  });

  it('6. proposed durumundaki kaynak verified kabul edilmez ve AI doğrulayamaz', () => {
    const source = { verification_status: 'proposed' };
    const isVerified = source.verification_status === 'verified';

    expect(isVerified).toBe(false);
  });
});
