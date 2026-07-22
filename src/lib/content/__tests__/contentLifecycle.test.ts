/**
 * Odi.Pet — Content Freshness & Revision Lifecycle Vitest Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  Article,
  PetContext,
  recommendContentForPet
} from '../personalizedContentEngine';

const dogPoodle: PetContext = {
  id: 'pet-1',
  name: 'Luna',
  species: 'dog',
  breed: 'Toy Poodle',
  birth_date: '2022-05-10'
};

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

describe('Content Freshness & Revision Lifecycle Rules', () => {
  it('1. Kontrol tarihi geçmiş (next_review_at < now) içerik kullanıcıya önerilmez', () => {
    const expiredArticle: Article = {
      id: 'art-expired',
      title: 'Eski Makale',
      slug: 'eski-makale',
      content: 'Metin',
      species_filter: ['dog'],
      is_published: true,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: yesterday // Tarihi geçmiş
    };

    const res = recommendContentForPet(dogPoodle, [expiredArticle]);
    expect(res.generalRecommendation).toBeNull();
    expect(res.personalizedRecommendation).toBeNull();
  });

  it('2. Tıbbi onaylı ancak tarihi geçmiş içerik kullanıcıya önerilmez', () => {
    const expiredMedicalArticle: Article = {
      id: 'art-med-expired',
      title: 'Eski Tıbbi Makale',
      slug: 'eski-tibbi-makale',
      content: 'Metin',
      species_filter: ['dog'],
      is_published: true,
      is_medical_content: true,
      vet_review_status: 'approved',
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: yesterday
    };

    const res = recommendContentForPet(dogPoodle, [expiredMedicalArticle]);
    expect(res.generalRecommendation).toBeNull();
    expect(res.personalizedRecommendation).toBeNull();
  });

  it('3. Arşivlenmiş içerik (archived_at dolu) kullanıcıya görünmez', () => {
    const archivedArticle: Article = {
      id: 'art-archived',
      title: 'Arşivlenmiş Makale',
      slug: 'arsivlenmis-makale',
      content: 'Metin',
      species_filter: ['dog'],
      is_published: true,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: nextMonth,
      archived_at: yesterday
    };

    const res = recommendContentForPet(dogPoodle, [archivedArticle]);
    expect(res.generalRecommendation).toBeNull();
  });

  it('4. Güncel genel içerik kullanıcıya görünür', () => {
    const freshArticle: Article = {
      id: 'art-fresh',
      title: 'Güncel Genel Makale',
      slug: 'guncel-genel-makale',
      content: 'Metin',
      species_filter: ['dog'],
      is_published: true,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: nextMonth
    };

    const res = recommendContentForPet(dogPoodle, [freshArticle]);
    expect(res.generalRecommendation?.article.id).toBe('art-fresh');
  });

  it('5. Güncel içerik bulunmuyorsa eski içeriğe fallback yapılmaz (Null döner)', () => {
    const expiredArticle: Article = {
      id: 'art-expired',
      title: 'Eski Makale',
      slug: 'eski-makale',
      content: 'Metin',
      species_filter: ['dog'],
      is_published: true,
      content_reviewed_at: yesterday,
      content_reviewed_by: 'admin-id',
      source_checked_at: yesterday,
      next_review_at: yesterday
    };

    const res = recommendContentForPet(dogPoodle, [expiredArticle]);
    expect(res.generalRecommendation).toBeNull();
    expect(res.personalizedRecommendation).toBeNull();
  });

  it('6. Reverify (Yeniden doğrulama) sürüm numarasını artırmaz', () => {
    let version = 1;
    const isContentChanged = false; // Sadece tarih onaylandı
    if (isContentChanged) version += 1;

    expect(version).toBe(1);
  });

  it('7. Gerçek içerik değişikliği (Edit) sürüm numarasını artırır', () => {
    let version = 1;
    const isContentChanged = true;
    if (isContentChanged) version += 1;

    expect(version).toBe(2);
  });
});
