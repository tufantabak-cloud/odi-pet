/**
 * Odi.Pet — Personalized Content Helper Utilities
 */

export type LifeStage = 'junior' | 'adult' | 'senior' | 'senior_12plus';

export type BreedTrait =
  | 'long_hair'
  | 'curly_hair'
  | 'brachycephalic'
  | 'small_breed'
  | 'large_breed';

export type MatchingReasonType =
  | 'species'
  | 'breed'
  | 'trait'
  | 'life_stage'
  | 'season'
  | 'gender_neutered';

/**
 * Irk adlarını standart breed_key biçimine çevirir.
 * Örn: "Toy Poodle", "Toy Pudel", "Kaniş (Poodle)" -> "poodle"
 */
export function normalizeBreedKey(breedName: string | null | undefined): string {
  if (!breedName) return 'mixed';
  const clean = breedName.toLowerCase().trim();

  if (clean.includes('poodle') || clean.includes('pudel') || clean.includes('kaniş')) {
    return 'poodle';
  }
  if (clean.includes('golden')) {
    return 'golden_retriever';
  }
  if (clean.includes('labrador')) {
    return 'labrador_retriever';
  }
  if (clean.includes('alman kurdu') || clean.includes('alman çoban') || clean.includes('german shepherd')) {
    return 'german_shepherd';
  }
  if (clean.includes('french bulldog') || clean.includes('fransız bulldog') || clean.includes('fransız buldoğu')) {
    return 'french_bulldog';
  }
  if (clean.includes('pug') || clean.includes('mops')) {
    return 'pug';
  }
  if (clean.includes('rottweiler')) {
    return 'rottweiler';
  }
  if (clean.includes('shih tzu')) {
    return 'shih_tzu';
  }
  if (clean.includes('chihuahua') || clean.includes('çivava')) {
    return 'chihuahua';
  }
  if (clean.includes('yorkshire') || clean.includes('yorkie')) {
    return 'yorkshire_terrier';
  }
  if (clean.includes('british shorthair')) {
    return 'british_shorthair';
  }
  if (clean.includes('scottish fold')) {
    return 'scottish_fold';
  }
  if (clean.includes('siyam') || clean.includes('siamese')) {
    return 'siamese';
  }
  if (clean.includes('persian') || clean.includes('i̇ran kedisi') || clean.includes('iran kedisi')) {
    return 'persian';
  }
  if (clean.includes('maine coon')) {
    return 'maine_coon';
  }
  if (clean.includes('tekir') || clean.includes('melez') || clean.includes('mix') || clean.includes('karma') || clean.includes('bilinmeyen')) {
    return 'mixed';
  }

  return clean.replace(/\s+/g, '_');
}

/**
 * Irk adından veya key'inden tüy yapısı, basık burun, büyüklük gibi özellikleri döndürür.
 */
export function getBreedTraits(
  breedKeyOrName: string | null | undefined,
  weightKg?: number | null
): BreedTrait[] {
  const key = normalizeBreedKey(breedKeyOrName);
  const traitsSet = new Set<BreedTrait>();

  const breedTraitsMap: Record<string, BreedTrait[]> = {
    poodle: ['curly_hair', 'small_breed'],
    golden_retriever: ['long_hair', 'large_breed'],
    labrador_retriever: ['large_breed'],
    german_shepherd: ['long_hair', 'large_breed'],
    french_bulldog: ['brachycephalic', 'small_breed'],
    pug: ['brachycephalic', 'small_breed'],
    rottweiler: ['large_breed'],
    shih_tzu: ['long_hair', 'brachycephalic', 'small_breed'],
    chihuahua: ['small_breed'],
    yorkshire_terrier: ['long_hair', 'small_breed'],
    british_shorthair: ['small_breed'],
    scottish_fold: ['small_breed'],
    siamese: ['small_breed'],
    persian: ['long_hair', 'brachycephalic', 'small_breed'],
    maine_coon: ['long_hair', 'large_breed']
  };

  if (breedTraitsMap[key]) {
    breedTraitsMap[key].forEach((t) => traitsSet.add(t));
  }

  // Kilo bilgisine göre dinamik takviye
  if (weightKg !== undefined && weightKg !== null && weightKg > 0) {
    if (weightKg < 10) traitsSet.add('small_breed');
    if (weightKg >= 25) traitsSet.add('large_breed');
  }

  return Array.from(traitsSet);
}

/**
 * Kedi ve Köpek Ortak/Spesifik Yaş Skalasına Göre Yaşam Evresini Hesaplar:
 * - Doğum tarihi yoksa veya geçersizse `null` döner.
 * - Yavru (0 - 1 yaş / 0-11 ay): junior
 * - Yetişkin (1 - 7 yaş / 12-83 ay): adult
 * - Yaşlı (7 - 12 yaş / 84-143 ay): senior
 * - Yaşlı (12+ yaş / 144+ ay): senior_12plus
 */
export function getPetLifeStage(
  birthDate: string | Date | null | undefined,
  species?: string | null
): LifeStage | null {
  if (!birthDate) return null;

  const born = new Date(birthDate);
  if (isNaN(born.getTime())) return null;

  const now = new Date();
  const months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
  if (months < 0) return null;

  const normSpecies = (species || '').toLowerCase().trim();

  // Kedi ve Köpek Yaş Skalası
  if (months < 12) return 'junior';
  if (months < 84) return 'adult';
  if (months < 144) return 'senior';
  return 'senior_12plus';
}

/**
 * Eşleşme türüne ve pet ismine göre kullanıcıya gösterilecek Türkçe gerekçe metnini üretir.
 */
export function getRecommendationReason(
  matchingType: MatchingReasonType,
  petName: string = 'Pet'
): string {
  switch (matchingType) {
    case 'breed':
      return `${petName}'nin ırkına özel olduğu için öneriliyor.`;
    case 'trait':
      return `${petName}'nin tüy ve fiziki yapısına uygun olduğu için öneriliyor.`;
    case 'life_stage':
      return `${petName}'nin yaşam evresine uygun olduğu için öneriliyor.`;
    case 'season':
      return `Mevsimsel olarak önem taşıdığı için öneriliyor.`;
    case 'gender_neutered':
      return `${petName}'nin bakım profiline özel olduğu için öneriliyor.`;
    case 'species':
    default:
      return `${petName}'nin türüne uygun genel bilgi.`;
  }
}

/**
 * Normal kullanıcılara sunulacak içeriklerin tekilleştirilmiş merkezi görünürlük kuralı.
 */
export function isArticleEligibleForUser(article: any, hasActiveSources: boolean = false): boolean {
  if (!article) return false;

  // 1. Yayın ve Arşiv Durumu
  if (!article.is_published || article.archived_at) return false;

  // 2. Güncellik & Kontrol Tarihleri (NULL OLANLAR GÜNCEL KABUL EDİLMEZ)
  if (
    !article.content_reviewed_at ||
    !article.content_reviewed_by ||
    !article.source_checked_at ||
    !article.next_review_at
  ) {
    return false;
  }

  const now = new Date();
  if (new Date(article.next_review_at) < now) {
    return false;
  }

  // 3. Tıbbi İçerik Koşulları
  if (article.is_medical_content) {
    if (
      article.vet_review_status !== 'approved' ||
      !article.vet_reviewed_by ||
      !article.vet_reviewed_at ||
      !hasActiveSources
    ) {
      return false;
    }
  }

  return true;
}
