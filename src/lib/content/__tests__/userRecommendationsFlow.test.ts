/**
 * Odi.Pet — User Recommendations Flow & Security Vitest Suite
 */

import { describe, it, expect } from 'vitest';
import {
  Article,
  ArticlePetState,
  PetContext,
  recommendContentForPet
} from '../personalizedContentEngine';

const validReviewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const reviewedAt = new Date().toISOString();

const mockArticles: Article[] = [
  {
    id: 'art-gen-dog-1',
    title: 'Sıcak Havada Köpek Gezdirme',
    slug: 'sicak-havada-kopek-gezdirme',
    content: 'Genel...',
    species_filter: ['dog'],
    is_published: true,
    is_medical_content: false,
    priority_order: 10,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: validReviewDate
  },
  {
    id: 'art-gen-cat-1',
    title: 'Kedilerde Su Tüketimi',
    slug: 'kedilerde-su-tuketimi',
    content: 'Genel...',
    species_filter: ['cat'],
    is_published: true,
    is_medical_content: false,
    priority_order: 10,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: validReviewDate
  },
  {
    id: 'art-poodle-special',
    title: 'Poodle Tüy Tarama Rehberi',
    slug: 'poodle-tuy-tarama',
    content: 'Poodle özel...',
    species_filter: ['dog'],
    target_breed_keys: ['poodle'],
    is_published: true,
    is_medical_content: false,
    priority_order: 20,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: validReviewDate
  },
  {
    id: 'art-draft',
    title: 'Taslak Makale',
    slug: 'taslak-makale',
    content: 'Taslak...',
    species_filter: ['dog'],
    is_published: false,
    priority_order: 100
  },
  {
    id: 'art-pending-med',
    title: 'Onaysız Tıbbi Makale',
    slug: 'onaysiz-tibbi-makale',
    content: 'Tıbbi...',
    species_filter: ['dog'],
    is_published: true,
    is_medical_content: true,
    vet_review_status: 'pending',
    priority_order: 100
  }
];

const dogPoodle: PetContext = {
  id: 'pet-poodle',
  name: 'Luna',
  species: 'dog',
  breed: 'Toy Poodle',
  birth_date: '2022-05-10'
};

const catTekir: PetContext = {
  id: 'pet-tekir',
  name: 'Mişa',
  species: 'cat',
  breed: 'Tekir',
  birth_date: '2023-01-01'
};

describe('User Recommendations Flow & Security Rules', () => {
  it('1. Pet A (Köpek/Poodle) ve Pet B (Kedi) tamamen farklı öneriler alır', () => {
    const resA = recommendContentForPet(dogPoodle, mockArticles);
    const resB = recommendContentForPet(catTekir, mockArticles);

    expect(resA.personalizedRecommendation?.article.id).toBe('art-poodle-special');
    expect(resB.generalRecommendation?.article.id).toBe('art-gen-cat-1');
    expect(resB.personalizedRecommendation).toBeNull();
  });

  it('2. Kediye köpek içeriği kesinlikle önerilmez', () => {
    const resCat = recommendContentForPet(catTekir, mockArticles);
    if (resCat.generalRecommendation?.article) {
      expect(resCat.generalRecommendation.article.species_filter).not.toContain('dog');
    }
    if (resCat.personalizedRecommendation?.article) {
      expect(resCat.personalizedRecommendation.article.species_filter).not.toContain('dog');
    }
  });

  it('3. Taslak (is_published=false) ve Onaysız tıbbi içerikler kullanıcıya görünmez', () => {
    const resDog = recommendContentForPet(dogPoodle, mockArticles);
    expect(resDog.generalRecommendation?.article.id).not.toBe('art-draft');
    expect(resDog.generalRecommendation?.article.id).not.toBe('art-pending-med');
    expect(resDog.personalizedRecommendation?.article.id).not.toBe('art-draft');
    expect(resDog.personalizedRecommendation?.article.id).not.toBe('art-pending-med');
  });

  it('4. Dismiss edilen içerik ikinci sorguda kesinlikle engellenir', () => {
    const userStates: ArticlePetState[] = [
      {
        pet_id: dogPoodle.id,
        article_id: 'art-poodle-special',
        dismissed_at: new Date()
      }
    ];

    const res = recommendContentForPet(dogPoodle, mockArticles, userStates);
    expect(res.personalizedRecommendation).toBeNull();
    expect(res.generalRecommendation?.article.id).toBe('art-gen-dog-1');
  });

  it('5. Hiç uygun içerik kalmadığında her iki öneri de null döner (Bölüm gizlenir)', () => {
    const emptyArticles: Article[] = [];
    const res = recommendContentForPet(dogPoodle, emptyArticles);
    expect(res.generalRecommendation).toBeNull();
    expect(res.personalizedRecommendation).toBeNull();
  });
});
