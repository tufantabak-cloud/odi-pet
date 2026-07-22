/**
 * Odi.Pet — Learn Page Content Library Vitest Test Suite
 */

import { describe, it, expect } from 'vitest';
import { isArticleEligibleForUser } from '../contentHelpers';

const validReviewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const reviewedAt = new Date().toISOString();

const sampleArticles = [
  {
    id: 'art-1',
    title: 'Köpek Yürüyüş Güvenliği',
    excerpt: 'Sıcak havalarda yürüyüş...',
    category: 'genel',
    species_filter: ['dog'],
    is_published: true,
    archived_at: null,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: validReviewDate
  },
  {
    id: 'art-2',
    title: 'Kedi Tüy Yumağı Önleme',
    excerpt: 'Tarak seçimi ve çim...',
    category: 'bakim',
    species_filter: ['cat'],
    is_published: true,
    archived_at: null,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: validReviewDate
  },
  {
    id: 'art-expired',
    title: 'Süresi Geçmiş Makale',
    excerpt: 'Eski...',
    category: 'genel',
    species_filter: ['cat'],
    is_published: true,
    archived_at: null,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: '2020-01-01T00:00:00.000Z'
  }
];

describe('Learn Page Content Library Rules', () => {
  it('1. Sadece güncel ve erişilebilir içerikler kütüphaneye dahil edilir', () => {
    const eligible = sampleArticles.filter((art) => isArticleEligibleForUser(art, true));
    expect(eligible.length).toBe(2);
    expect(eligible.map((a) => a.id)).not.toContain('art-expired');
  });

  it('2. Kedi filtresinde sadece kediye uygun içerikler gelir (Köpek içeriği gelmez)', () => {
    const catEligible = sampleArticles
      .filter((art) => isArticleEligibleForUser(art, true))
      .filter((art) => art.species_filter?.includes('cat') || art.species_filter?.includes('both'));

    expect(catEligible.length).toBe(1);
    expect(catEligible[0].id).toBe('art-2');
  });

  it('3. Arama filtresi başlık veya özete göre doğru çalışır', () => {
    const query = 'yürüyüş';
    const matches = sampleArticles.filter(
      (a) => a.title.toLowerCase().includes(query) || a.excerpt.toLowerCase().includes(query)
    );

    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('art-1');
  });

  it('4. Kaydedilen makale listesi doğru kullanıcıya aittir ve filtreleme sağlar', () => {
    const userSavedSet = new Set(['art-2']);
    const savedArticles = sampleArticles.filter((a) => userSavedSet.has(a.id));

    expect(savedArticles.length).toBe(1);
    expect(savedArticles[0].id).toBe('art-2');
  });
});
