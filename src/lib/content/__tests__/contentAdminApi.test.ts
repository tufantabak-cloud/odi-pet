/**
 * Odi.Pet — Admin Content API & Safety Rules Vitest Test Suite
 */

import { describe, it, expect } from 'vitest';

// API Yayın Güvenliği Mantık Doğrulama Yardımcısı
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

  it('5. Onaysız tıbbi içerik taslak (is_published = false) olarak kaydedilebilir', () => {
    const res = validateArticlePublishRules({
      title: 'Taslak Tıbbi İçerik',
      slug: 'taslak-tibbi-icerik',
      excerpt: 'Özet',
      content: 'İçerik',
      species_filter: ['cat'],
      is_medical_content: true,
      vet_review_status: 'pending',
      is_published: false
    });

    expect(res.valid).toBe(true);
  });
});
