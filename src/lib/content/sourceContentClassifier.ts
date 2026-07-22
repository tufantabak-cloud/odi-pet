/**
 * Odi.Pet — Monitored Source Content Classifier (Phase 1)
 * 
 * Kurallar:
 * 1. Kedi, köpek veya ikisine uygunluk tespiti.
 * 2. Kategori sınıflandırması (saglik, beslenme, bakim, egitim, davranis, hijyen, guvenlik, yavru_bakimi, sosyal_yasam).
 * 3. Otomatik ret kriterleri:
 *    - Kedi/köpekle ilgisiz içerik
 *    - Yalnız satış/reklam içeriği
 *    - Kanıtsız mucize tedavi iddiası
 *    - İlaç/doz önerisi
 *    - İnsan sağlığı içeriği
 *    - Kopya / mükerrer içerik
 */

export interface ContentClassificationResult {
  isEligible: boolean;
  speciesScope: 'cat' | 'dog' | 'both';
  category: string;
  isMedicalContent: boolean;
  needsAdminClassification?: boolean;
  rejectionReason?: string;
}

export function classifyDiscoveredContent(
  title: string,
  rawText: string = '',
  sourceType: string = 'web_page'
): ContentClassificationResult {
  const normTitle = title.toLowerCase();
  const normText = rawText.toLowerCase();
  const combined = `${normTitle} ${normText}`;

  // 1. İnsan Sağlığı veya Pet Dışı Canlı Engeli
  if (
    combined.includes('insan sağlığı') ||
    combined.includes('covid-19 human') ||
    combined.includes('balkan turu') ||
    combined.includes('kripto para') ||
    combined.includes('hisse senedi')
  ) {
    return {
      isEligible: false,
      speciesScope: 'both',
      category: 'genel',
      isMedicalContent: false,
      rejectionReason: 'Pet dışı veya insan sağlığı/alakasız konu engeline takıldı.'
    };
  }

  // 2. Yalnızca Satış / Reklam İçeriği
  if (
    combined.includes('%50 indirim') ||
    combined.includes('satın almak için tıklayın') ||
    combined.includes('sipariş ver') ||
    combined.includes('kargo bedava')
  ) {
    return {
      isEligible: false,
      speciesScope: 'both',
      category: 'genel',
      isMedicalContent: false,
      rejectionReason: 'Yalnızca satış veya ticari reklam içeriği reddedildi.'
    };
  }

  // 3. İlaç / Doz veya Kanıtsız Mucize Tedavi İddiası
  if (
    combined.includes('kesin tedavi eden mucize') ||
    combined.includes('dozunda verin') ||
    combined.includes('mg/kg doz') ||
    combined.includes('reçetesiz ilaç kullanımı')
  ) {
    return {
      isEligible: false,
      speciesScope: 'both',
      category: 'saglik',
      isMedicalContent: true,
      rejectionReason: 'Kanıtsız mucize tedavi veya reçetesiz ilaç/doz tavsiyesi engellendi.'
    };
  }

  // 4. Tür Tespiti
  const hasCat = /kedi|kediler|feline|kitten|pisi/.test(combined);
  const hasDog = /köpek|köpekler|puppy|dog|canine/.test(combined);

  let speciesScope: 'cat' | 'dog' | 'both' = 'both';
  if (hasCat && !hasDog) speciesScope = 'cat';
  if (hasDog && !hasCat) speciesScope = 'dog';

  if (!hasCat && !hasDog && sourceType === 'instagram_post') {
    speciesScope = 'both';
  }

  // 5. Kategori Tespiti ve Tıbbi İçerik Bayrağı
  let category = 'bakim';
  let isMedicalContent = false;
  let hasSpecificKeyword = true;

  if (/\başı\b|\başılar\b|\başısı\b|hastalık|tedavi|enfeksiyon|parazit|vücut sıcaklığı|kusma|ishal|veteriner|klinik/.test(combined)) {
    category = 'saglik';
    isMedicalContent = true;
  } else if (/mama|beslenme|su tüketimi|diyet|protein|yaş mama|kuru mama|vitamin/.test(combined)) {
    category = 'beslenme';
    isMedicalContent = true; // Beslenme tıbbi denetim gerektirir
  } else if (/eğitim|komut|tuvalet eğitimi|tasma eğitimi/.test(combined)) {
    category = 'egitim';
  } else if (/davranış|tırmalama|miyavlama|havlama|sosyalleşme|ansiyete|anKsiyete/.test(combined)) {
    category = 'davranis';
  } else if (/tarak|tüy bakımı|banyo|tırnak kesimi|kulak temizliği/.test(combined)) {
    category = 'bakim';
  } else if (/kum kabı|dezenfeksiyon|temizlik|hijyen/.test(combined)) {
    category = 'hijyen';
  } else if (/zehirlenme|ev içi tehlike|balkon filesi|güvenlik/.test(combined)) {
    category = 'guvenlik';
  } else if (/yavru|yavru kedi|yavru köpek|süt tozu/.test(combined)) {
    category = 'yavru_bakimi';
  } else if (/park|seyahat|taşınma|otobüs/.test(combined)) {
    category = 'sosyal_yasam';
  } else {
    hasSpecificKeyword = false;
  }

  // If title is generic like "Instagram Paylaşımı (...)" and no keyword matched, flag for admin classification
  const isGenericTitle = normTitle.includes('instagram') || title.length < 5;
  const needsAdminClassification = isGenericTitle && !hasSpecificKeyword;

  return {
    isEligible: true,
    speciesScope,
    category,
    isMedicalContent,
    needsAdminClassification
  };
}
