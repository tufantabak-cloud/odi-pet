/**
 * Odi.Pet — Personalized Content Recommendation Engine & Lifecycle Manager
 */

import {
  LifeStage,
  MatchingReasonType,
  getBreedTraits,
  getPetLifeStage,
  getRecommendationReason,
  normalizeBreedKey
} from './contentHelpers';

export interface PetContext {
  id: string;
  name: string;
  species: string; // 'cat' | 'dog'
  breed?: string | null;
  birth_date?: string | Date | null;
  gender?: string | null; // 'male' | 'female' | 'unknown'
  is_neutered?: boolean | null;
  weight_kg?: number | null;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  cover_url?: string | null;
  category?: string | null;
  species_filter?: string[] | null; // ['cat'], ['dog'], ['both'] veya null
  target_breed_keys?: string[] | null;
  target_breed_traits?: string[] | null;
  target_life_stages?: string[] | null;
  target_genders?: string[] | null;
  target_neutered_status?: string | null; // 'all' | 'neutered' | 'intact'
  target_seasons?: string[] | null; // ['spring', 'summer', 'autumn', 'winter']
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  priority_order?: number | null;
  is_published?: boolean | null;
  is_medical_content?: boolean | null;
  vet_review_status?: string | null; // 'not_required' | 'pending' | 'approved'
  references_list?: string[] | null;
  created_at?: string | null;
  // Güncellik ve Yaşam Döngüsü Alanları
  freshness_type?: 'evergreen' | 'seasonal' | 'medical' | 'product_regulatory' | null;
  review_interval_days?: number | null;
  content_reviewed_at?: string | Date | null;
  content_reviewed_by?: string | null;
  source_checked_at?: string | Date | null;
  next_review_at?: string | Date | null;
  content_version?: number | null;
  latest_change_summary?: string | null;
  archived_at?: string | Date | null;
}

export interface ArticlePetState {
  article_id: string;
  pet_id: string;
  dismissed_at?: string | Date | null;
  read_at?: string | Date | null;
}

export interface RecommendationItem {
  article: Article;
  reason: string;
  matchingType: MatchingReasonType;
}

export interface EngineResult {
  generalRecommendation: RecommendationItem | null;
  personalizedRecommendation: RecommendationItem | null;
}

export interface EngineOptions {
  currentSeason?: 'spring' | 'summer' | 'autumn' | 'winter';
}

/**
 * Kişiselleştirilmiş İçerik Motoru
 */
export function recommendContentForPet(
  pet: PetContext,
  articles: Article[],
  userStates: ArticlePetState[] = [],
  options: EngineOptions = {}
): EngineResult {
  if (!pet || !articles || articles.length === 0) {
    return { generalRecommendation: null, personalizedRecommendation: null };
  }

  const petSpecies = (pet.species || '').toLowerCase().trim(); // 'cat' | 'dog'
  const normalizedBreed = normalizeBreedKey(pet.breed);
  const traits = getBreedTraits(pet.breed, pet.weight_kg);
  const lifeStage = getPetLifeStage(pet.birth_date, pet.species);
  const currentSeason = options.currentSeason;

  // 1. Tüketilmiş / Dismiss Edilmiş İçerik İzolasyonu
  const dismissedArticleIds = new Set(
    userStates
      .filter((st) => st.pet_id === pet.id && st.dismissed_at)
      .map((st) => st.article_id)
  );

  // 2. Temel Geçerlilik, Güncellik ve Tür Filtreleme (Hard Filter)
  const now = new Date();
  const validArticles = articles.filter((art) => {
    // Yayında olmalı
    if (art.is_published === false) return false;

    // Arşivlenmiş içerik kullanıcıya görünmez
    if (art.archived_at) return false;

    // Güncellik kontrol süresi geçmiş içerik kullanıcıya görünmez
    if (art.next_review_at && new Date(art.next_review_at) < now) {
      return false;
    }

    // Dismiss edilmiş içerik gelmez
    if (dismissedArticleIds.has(art.id)) return false;

    // Tıbbi içerik onaylanmamışsa gelmez
    if (art.is_medical_content && art.vet_review_status !== 'approved') {
      return false;
    }

    // Yayın tarih aralığı
    if (art.start_date && new Date(art.start_date) > now) return false;
    if (art.end_date && new Date(art.end_date) < now) return false;

    // Tür Filtresi (Kediye Köpek İçeriği GELMEZ)
    if (art.species_filter && art.species_filter.length > 0) {
      const allowed = art.species_filter.map((s) => s.toLowerCase());
      if (!allowed.includes('both') && !allowed.includes(petSpecies)) {
        return false;
      }
    }

    return true;
  });

  // Makaleleri admin sırasına (priority_order DESC) göre sıralayalım
  const sortedArticles = [...validArticles].sort((a, b) => {
    const pA = a.priority_order ?? 0;
    const pB = b.priority_order ?? 0;
    return pB - pA;
  });

  let personalizedCandidate: RecommendationItem | null = null;
  let generalCandidate: RecommendationItem | null = null;

  // 3. Kişiselleştirilmiş Adayın Tespiti
  for (const art of sortedArticles) {
    let matchedType: MatchingReasonType | null = null;

    // a. Irk Eşleşmesi
    if (art.target_breed_keys && art.target_breed_keys.length > 0) {
      if (art.target_breed_keys.includes(normalizedBreed)) {
        matchedType = 'breed';
      }
    }

    // b. Irk Özelliği Eşleşmesi
    if (!matchedType && art.target_breed_traits && art.target_breed_traits.length > 0) {
      const traitMatch = art.target_breed_traits.some((tr) => traits.includes(tr as any));
      if (traitMatch) {
        matchedType = 'trait';
      }
    }

    // c. Yaşam Evresi Eşleşmesi
    if (!matchedType && lifeStage && art.target_life_stages && art.target_life_stages.length > 0) {
      if (art.target_life_stages.includes(lifeStage)) {
        matchedType = 'life_stage';
      }
    }

    // d. Cinsiyet & Kısırlaştırma Eşleşmesi
    if (!matchedType) {
      const genderMatch = art.target_genders && art.target_genders.length > 0 && pet.gender
        ? art.target_genders.includes(pet.gender.toLowerCase())
        : false;

      const neuteredMatch = art.target_neutered_status && art.target_neutered_status !== 'all'
        ? (art.target_neutered_status === 'neutered' && pet.is_neutered === true) ||
          (art.target_neutered_status === 'intact' && pet.is_neutered === false)
        : false;

      if (genderMatch || neuteredMatch) {
        matchedType = 'gender_neutered';
      }
    }

    // e. Mevsim Eşleşmesi
    if (!matchedType && currentSeason && art.target_seasons && art.target_seasons.length > 0) {
      if (art.target_seasons.includes(currentSeason)) {
        matchedType = 'season';
      }
    }

    if (matchedType) {
      personalizedCandidate = {
        article: art,
        matchingType: matchedType,
        reason: getRecommendationReason(matchedType, pet.name)
      };
      break;
    }
  }

  // 4. Genel Adayın Tespiti
  for (const art of sortedArticles) {
    if (personalizedCandidate && art.id === personalizedCandidate.article.id) {
      continue;
    }

    const hasSpecificTargeting =
      (art.target_breed_keys && art.target_breed_keys.length > 0) ||
      (art.target_breed_traits && art.target_breed_traits.length > 0) ||
      (art.target_life_stages && art.target_life_stages.length > 0) ||
      (art.target_genders && art.target_genders.length > 0) ||
      (art.target_neutered_status && art.target_neutered_status !== 'all') ||
      (art.target_seasons && art.target_seasons.length > 0);

    if (!hasSpecificTargeting) {
      generalCandidate = {
        article: art,
        matchingType: 'species',
        reason: getRecommendationReason('species', pet.name)
      };
      break;
    }
  }

  return {
    generalRecommendation: generalCandidate,
    personalizedRecommendation: personalizedCandidate
  };
}
