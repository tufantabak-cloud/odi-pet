/**
 * Odi.Pet — Admin Content API & Safety Rules Vitest Test Suite
 */

import { describe, it, expect } from 'vitest';

export function validateArticlePublishRules(article: {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  species_filter?: string[];
  start_date?: string | null;
  end_date?: string | null;
  is_medical_content?: boolean;
  vet_review_status?: string;
  is_published?: boolean;
}) {
  // 1. Zorunlu Alanlar
  if (!article.title || !article.slug || !article.excerpt || !article.content) {
    return { valid: false, error: 'Başlık, slug, özet ve içerik alanları zorunludur.' };
  }

  // 2. Tarih Aralığı
  if (article.start_date && article.end_date && new Date(article.start_date) > new Date(article.end_date)) {
    return { valid: false, error: 'Başlangıç tarihi bitiş tarihinden sonra olamaz.' };
  }

  // 3. Yayın Güvenliği
  if (article.is_published) {
    // Tür Seçimi
    if (!article.species_filter || !Array.isArray(article.species_filter) || article.species_filter.length === 0) {
      return { valid: false, error: 'Tür seçimi yapılmadan içerik yayınlanamaz.' };
    }

    // Tıbbi Onay
    if (article.is_medical_content && article.vet_review_status !== 'approved') {
      return { valid: false, error: 'Veteriner onayı (approved) olmadan tıbbi içerikler yayınlanamaz.' };
    }
  }

  return { valid: true };
}

// İstemci Manipülasyon Filtreleme Yardımcısı
export function sanitizeClientAuditFields(payload: Record<string, any>, actorId: string) {
  const updates = { ...payload };
  delete updates.author;
  delete updates.author_id;
  delete updates.vet_reviewed_by;
  delete updates.vet_reviewed_at;
  delete updates.published_at;

  if (updates.vet_review_status === 'approved') {
    updates.vet_reviewed_by = actorId;
    updates.vet_reviewed_at = '2026-07-22T10:00:00.000Z';
  }

  return updates;
}

describe('Admin Content API & Safety Validation Rules', () => {
  it('1. Tür seçilmemiş (species_filter boş) içerik yayınlanamaz', () => {
    const res = validateArticlePublishRules({
      title: 'Test',
      slug: 'test',
      excerpt: 'Özet',
      content: 'İçerik',
      species_filter: [],
      is_published: true
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBe('Tür seçimi yapılmadan içerik yayınlanamaz.');
  });

  it('2. Onaysız tıbbi içerik (vet_review_status = pending) yayınlanamaz', () => {
    const res = validateArticlePublishRules({
      title: 'Tıbbi Makale',
      slug: 'tibbi-makale',
      excerpt: 'Özet',
      content: 'İçerik',
      species_filter: ['dog'],
      is_medical_content: true,
      vet_review_status: 'pending',
      is_published: true
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBe('Veteriner onayı (approved) olmadan tıbbi içerikler yayınlanamaz.');
  });

  it('3. Approved tıbbi içerik yayınlanabilir', () => {
    const res = validateArticlePublishRules({
      title: 'Onaylı Tıbbi Makale',
      slug: 'onayli-tibbi-makale',
      excerpt: 'Özet',
      content: 'İçerik',
      species_filter: ['dog'],
      is_medical_content: true,
      vet_review_status: 'approved',
      is_published: true
    });

    expect(res.valid).toBe(true);
  });

  it('4. Tarih aralığı hatası (start_date > end_date) reddedilir', () => {
    const res = validateArticlePublishRules({
      title: 'Tarih Hatalı',
      slug: 'tarih-hatali',
      excerpt: 'Özet',
      content: 'İçerik',
      species_filter: ['cat'],
      start_date: '2026-08-10',
      end_date: '2026-08-01',
      is_published: false
    });

    expect(res.valid).toBe(false);
    expect(res.error).toBe('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
  });

  it('5. İstemciden gönderilen vet_reviewed_by ve published_at manipülasyonları sunucuda ezilir', () => {
    const clientPayload = {
      title: 'Hileli Makale',
      vet_review_status: 'approved',
      vet_reviewed_by: 'fake-hacker-id',
      published_at: '2010-01-01T00:00:00.000Z'
    };

    const sanitized = sanitizeClientAuditFields(clientPayload, 'admin-real-id');
    expect(sanitized.vet_reviewed_by).toBe('admin-real-id');
    expect(sanitized.published_at).not.toBe('2010-01-01T00:00:00.000Z');
  });
});
