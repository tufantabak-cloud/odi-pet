/**
 * Odi.Pet — Personalized Content Engine Vitest Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  Article,
  ArticlePetState,
  PetContext,
  recommendContentForPet
} from '../personalizedContentEngine';
import { getPetLifeStage, normalizeBreedKey } from '../contentHelpers';

const validReviewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const reviewedAt = new Date().toISOString();

const mockArticles: Article[] = [
  {
    id: 'art-gen-dog',
    title: 'Sıcak Havada Köpek Gezdirme Rehberi',
    slug: 'sicak-havada-kopek-gezdirme',
    content: 'Genel köpek bakımı...',
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
    id: 'art-gen-cat',
    title: 'Kedilerde Su Tuketimini Artirma Yollari',
    slug: 'kedilerde-su-tuketimi',
    content: 'Genel kedi bakımı...',
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
    id: 'art-poodle-curly',
    title: 'Kıvırcık Tüylü Köpekler İçin Tarak Seçimi',
    slug: 'kivircik-tuy-bakimi',
    content: 'Poodle tüy tarama önerisi...',
    species_filter: ['dog'],
    target_breed_traits: ['curly_hair'],
    is_published: true,
    is_medical_content: false,
    priority_order: 20,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: validReviewDate
  },
  {
    id: 'art-junior-cat',
    title: 'Yavru Kedi Besleme ve Oyun Rutini',
    slug: 'yavru-kedi-besleme',
    content: 'Yavru kediler için...',
    species_filter: ['cat'],
    target_life_stages: ['junior'],
    is_published: true,
    is_medical_content: false,
    priority_order: 15,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: validReviewDate
  },
  {
    id: 'art-medical-unapproved',
    title: 'Köpeklerde Eklem Ağrısına İlaç Teşhisi',
    slug: 'eklem-agrisi-tehsisi',
    content: 'Medikal içerik...',
    species_filter: ['dog'],
    is_published: true,
    is_medical_content: true,
    vet_review_status: 'pending',
    priority_order: 100,
    content_reviewed_at: reviewedAt,
    content_reviewed_by: 'admin-id',
    source_checked_at: reviewedAt,
    next_review_at: validReviewDate
  }
];

const dogPoodle: PetContext = {
  id: 'pet-1',
  name: 'Luna',
  species: 'dog',
  breed: 'Toy Poodle',
  birth_date: '2022-05-10'
};

const catTekir: PetContext = {
  id: 'pet-2',
  name: 'Mişa',
  species: 'cat',
  breed: 'Tekir',
  birth_date: '2023-01-01'
};

const petNoBirthDate: PetContext = {
  id: 'pet-3',
  name: 'Pamuk',
  species: 'cat',
  breed: null,
  birth_date: null
};

describe('Personalized Content Recommendation Engine', () => {
  it('1. Kediye köpek içeriği önerilmez', () => {
    const res = recommendContentForPet(catTekir, mockArticles);
    if (res.generalRecommendation?.article) {
      expect(res.generalRecommendation.article.species_filter).not.toContain('dog');
    }
    if (res.personalizedRecommendation?.article) {
      expect(res.personalizedRecommendation.article.species_filter).not.toContain('dog');
    }
  });

  it('2. Bilinmeyen veya melez ırkta güvenli fallback ve genel içerik gelir', () => {
    const resNoDob = recommendContentForPet(petNoBirthDate, mockArticles);
    expect(resNoDob.generalRecommendation?.article.id).toBe('art-gen-cat');
    expect(resNoDob.personalizedRecommendation).toBeNull();
  });

  it('3. Poodle için kıvırcık tüy (curly_hair) eşleşmesi gelir', () => {
    const resPoodle = recommendContentForPet(dogPoodle, mockArticles);
    expect(resPoodle.personalizedRecommendation?.article.id).toBe('art-poodle-curly');
  });

  it('4. Dismiss edilmiş (ilgilenmiyorum denilen) içerik dönmez', () => {
    const userStates: ArticlePetState[] = [
      {
        pet_id: dogPoodle.id,
        article_id: 'art-poodle-curly',
        dismissed_at: new Date()
      }
    ];

    const res = recommendContentForPet(dogPoodle, mockArticles, userStates);
    expect(res.personalizedRecommendation).toBeNull();
    expect(res.generalRecommendation?.article.id).toBe('art-gen-dog');
  });

  it('5. Onaylanmamış tıbbi içerik (is_medical_content=true, vet_review_status!=approved) elenir', () => {
    const res = recommendContentForPet(dogPoodle, mockArticles);
    expect(res.generalRecommendation?.article.id).not.toBe('art-medical-unapproved');
    expect(res.personalizedRecommendation?.article.id).not.toBe('art-medical-unapproved');
  });

  it('6. İki öneri (generalRecommendation ve personalizedRecommendation) aynı makale olamaz', () => {
    const res = recommendContentForPet(catTekir, mockArticles);
    if (res.generalRecommendation && res.personalizedRecommendation) {
      expect(res.generalRecommendation.article.id).not.toBe(res.personalizedRecommendation.article.id);
    }
  });

  it('7. getPetLifeStage doğum tarihi yoksa null döner ve tür ayrımı yapar', () => {
    expect(getPetLifeStage(null, 'dog')).toBeNull();
    expect(getPetLifeStage('2022-05-10', 'dog')).toBe('adult');
  });

  it('8. normalizeBreedKey bilinmeyen/yazım farkı olan ırkları standart key-e dönüştürür', () => {
    expect(normalizeBreedKey('Toy Pudel')).toBe('poodle');
    expect(normalizeBreedKey('Kaniş')).toBe('poodle');
    expect(normalizeBreedKey('Bilinmeyen')).toBe('mixed');
  });
});
