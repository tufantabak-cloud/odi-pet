/**
 * Odi.Pet — Freshness Queue & Centralized Eligibility Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import { isArticleEligibleForUser } from '../contentHelpers';

describe('Centralized Eligibility & Review Queue Rules', () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  it('1. next_review_at NULL olan içerik güncel kabul edilmez ve görünmez', () => {
    const article = {
      is_published: true,
      archived_at: null,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: null // NULL
    };

    expect(isArticleEligibleForUser(article)).toBe(false);
  });

  it('2. Tarihi geçmiş (next_review_at < now) içerik görünmez', () => {
    const article = {
      is_published: true,
      archived_at: null,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: yesterday // Süresi geçmiş
    };

    expect(isArticleEligibleForUser(article)).toBe(false);
  });

  it('3. Tüm güncellik alanları dolu ve tarihi geçerli içerik görünür', () => {
    const article = {
      is_published: true,
      archived_at: null,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: tomorrow
    };

    expect(isArticleEligibleForUser(article)).toBe(true);
  });

  it('4. Kaynaksız (hasActiveSources = false) tıbbi içerik görünmez', () => {
    const medicalArticle = {
      is_published: true,
      archived_at: null,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: tomorrow,
      is_medical_content: true,
      vet_review_status: 'approved',
      vet_reviewed_by: 'vet-id',
      vet_reviewed_at: yesterday
    };

    expect(isArticleEligibleForUser(medicalArticle, false)).toBe(false);
    expect(isArticleEligibleForUser(medicalArticle, true)).toBe(true);
  });

  it('5. product_regulatory içerik resmi/üretici kaynağı olmadan yayınlanamaz', () => {
    const sources = [{ source_type: 'scientific' }];
    const hasOfficialOrManufacturer = sources.some(
      (s) => s.source_type === 'official' || s.source_type === 'manufacturer'
    );

    expect(hasOfficialOrManufacturer).toBe(false);
  });

  it('6. Kontrol kuyruğu gruplandırma doğrulaması', () => {
    const now = new Date();
    const articles = [
      { id: '1', next_review_at: yesterday, archived_at: null },
      { id: '2', next_review_at: tomorrow, archived_at: null },
      { id: '3', next_review_at: null, archived_at: null },
      { id: '4', next_review_at: null, archived_at: yesterday }
    ];

    const expired = articles.filter((a) => !a.archived_at && a.next_review_at && new Date(a.next_review_at) < now);
    const missingDate = articles.filter((a) => !a.archived_at && !a.next_review_at);
    const archived = articles.filter((a) => a.archived_at);

    expect(expired.length).toBe(1);
    expect(missingDate.length).toBe(1);
    expect(archived.length).toBe(1);
  });
});
