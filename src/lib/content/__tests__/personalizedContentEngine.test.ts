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

const mockArticles: Article[] = [
  {
    id: 'art-gen-dog',
    title: 'Sıcak Havada Köpek Gezdirme Rehberi',
    slug: 'sicak-havada-kopek-gezdirme',
    content: 'Genel köpek bakımı...',
    species_filter: ['dog'],
    is_published: true,
    is_medical_content: false,
    priority_order: 10
  },
  {
    id: 'art-gen-cat',
    title: 'Kedilerde Su Tuketimini Artirma Yollari',
    slug: 'kedilerde-su-tuketimi',
    content: 'Genel kedi bakımı...',
    species_filter: ['cat'],
    is_published: true,
    is_medical_content: false,
    priority_order: 10
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
    priority_order: 20
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
    priority_order: 15
  },
  {
    id: 'art-medical-unapproved',
    title: 'Köpeklerde Eklem Ağrısına İlaç Teşhisi',
    slug: 'eklem-agrisi-tehsisi',
    content: 'Tıbbi bilgi...',
    species_filter: ['dog'],
    is_published: true,
    is_medical_content: true,
    vet_review_status: 'pending', // Onaylanmamış!
    priority_order: 100
  },
  {
    id: 'art-medical-approved',
    title: 'Veteriner Hekim Onaylı Eklem Takviyesi Rehberi',
    slug: 'eklem-takviyesi-rehberi',
    content: 'Onaylı tıbbi bilgi...',
    species_filter: ['dog'],
    is_published: true,
    is_medical_content: true,
    vet_review_status: 'approved',
    priority_order: 30
  }
];

const dogPoodle: PetContext = {
  id: 'pet-poodle-1',
  name: 'Luna',
  species: 'dog',
  breed: 'Toy Poodle',
  birth_date: '2022-05-10',
  gender: 'female',
  is_neutered: true
};

const catKitten: PetContext = {
  id: 'pet-cat-1',
  name: 'Mişa',
  species: 'cat',
  breed: 'Tekir',
  birth_date: '2026-02-01', // Yavru (<1 yaş)
  gender: 'male',
  is_neutered: false
};

const petNoBirthDate: PetContext = {
  id: 'pet-no-dob',
  name: 'Bilinmeyen Yaşlı Kedi',
  species: 'cat',
  breed: 'Melez',
  birth_date: null
};

describe('Personalized Content Recommendation Engine', () => {
  it('1. Kediye köpek içeriği önerilmez', () => {
    const resCat = recommendContentForPet(catKitten, mockArticles);
    expect(resCat.generalRecommendation?.article.id).not.toBe('art-gen-dog');
    expect(resCat.personalizedRecommendation?.article.id).not.toBe('art-gen-dog');
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
    const states: ArticlePetState[] = [
      {
        pet_id: dogPoodle.id,
        article_id: 'art-poodle-curly',
        dismissed_at: new Date()
      }
    ];
    const resDismissed = recommendContentForPet(dogPoodle, mockArticles, states);
    expect(resDismissed.personalizedRecommendation?.article.id).not.toBe('art-poodle-curly');
  });

  it('5. Onaylanmamış tıbbi içerik (is_medical_content=true, vet_review_status!=approved) elenir', () => {
    const resMedical = recommendContentForPet(dogPoodle, mockArticles);
    expect(resMedical.generalRecommendation?.article.id).not.toBe('art-medical-unapproved');
    expect(resMedical.personalizedRecommendation?.article.id).not.toBe('art-medical-unapproved');
  });

  it('6. İki öneri (generalRecommendation ve personalizedRecommendation) aynı makale olamaz', () => {
    const res1 = recommendContentForPet(dogPoodle, mockArticles);
    if (res1.generalRecommendation && res1.personalizedRecommendation) {
      expect(res1.generalRecommendation.article.id).not.toBe(res1.personalizedRecommendation.article.id);
    }
  });

  it('7. getPetLifeStage doğum tarihi yoksa null döner ve tür ayrımı yapar', () => {
    expect(getPetLifeStage(null, 'cat')).toBeNull();
    expect(getPetLifeStage(undefined, 'dog')).toBeNull();
    expect(getPetLifeStage('2026-02-01', 'cat')).toBe('junior');
    expect(getPetLifeStage('2026-02-01', 'dog')).toBe('junior');
  });

  it('8. normalizeBreedKey bilinmeyen/yazım farkı olan ırkları standart key-e dönüştürür', () => {
    expect(normalizeBreedKey('Toy Pudel')).toBe('poodle');
    expect(normalizeBreedKey('Fransız Buldoğu')).toBe('french_bulldog');
    expect(normalizeBreedKey('Bilinmeyen')).toBe('mixed');
  });
});
