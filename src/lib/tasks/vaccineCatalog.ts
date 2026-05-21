/**
 * Odi.Pet — Görev Ekleme Wizard'ı için Aşı Kataloğu
 * 
 * Bu liste, kullanıcının görev eklerken seçebileceği bireysel aşıları tanımlar.
 * vaccine_templates tablosundaki kombine protokollerden (DHPPi, FVRCP vb.) farklıdır.
 * 
 * Serbest giriş yok — sadece bu listeden seçim yapılabilir.
 */

export type VaccineCatalogItem = {
  code: string;
  name: string;
  nameTr: string;
  species: 'dog' | 'cat';
  group: 'core' | 'optional';
};

// ─── Köpek Aşıları ───────────────────────────────────────────────
export const DOG_VACCINES: VaccineCatalogItem[] = [
  { code: 'DOG_GENERIC',    name: 'Generic Vaccination',                              nameTr: 'Genel Aşılama / Rutin Aşılar',               species: 'dog', group: 'core' },
  { code: 'DOG_CDV',        name: 'Canine Distemper',                                 nameTr: 'Gençlik Hastalığı (CDV)',                     species: 'dog', group: 'core' },
  { code: 'DOG_CAV1',       name: 'Canine Adenovirus Type 1 (CAV-1) [Hepatitis]',     nameTr: 'Köpek Hepatiti (CAV-1)',                      species: 'dog', group: 'core' },
  { code: 'DOG_RABIES',     name: 'Rabies',                                           nameTr: 'Kuduz (RV)',                                  species: 'dog', group: 'core' },
  { code: 'DOG_MEASLES',    name: 'Measles',                                          nameTr: 'Kızamık',                                     species: 'dog', group: 'core' },
  { code: 'DOG_CPV',        name: 'Parvovirus',                                       nameTr: 'Kanlı İshal (CPV)',                           species: 'dog', group: 'core' },
  { code: 'DOG_CAV2',       name: 'Canine Adenovirus-2 (CAV-2)',                      nameTr: 'Köpek Adenovirüsü Tip 2 / Solunum Yolu',     species: 'dog', group: 'core' },
  { code: 'DOG_CPIV',       name: 'Parainfluenza',                                    nameTr: 'Köpek Parainfluenzası (CPiV)',                 species: 'dog', group: 'core' },
  { code: 'DOG_BORRELIA',   name: 'Borrelia burgdorferi',                              nameTr: 'Lyme Hastalığı Bakterisi',                    species: 'dog', group: 'optional' },
  { code: 'DOG_BORDETELLA', name: 'Bordetella bronchiseptica [kennel cough]',          nameTr: 'Barınak Öksürüğü',                            species: 'dog', group: 'optional' },
  { code: 'DOG_LEPTO_C',    name: 'Leptospirosis canicola',                            nameTr: 'Leptospira Canicola Suşu',                    species: 'dog', group: 'optional' },
  { code: 'DOG_LEPTO_I',    name: 'Leptospirosis icterohaemorrhagiae',                 nameTr: 'Leptospira Icterohaemorrhagiae Suşu',         species: 'dog', group: 'optional' },
  { code: 'DOG_CCV',        name: 'Coronavirus',                                      nameTr: 'Köpek Koronavirüsü',                          species: 'dog', group: 'optional' },
  { code: 'DOG_LEISH',      name: 'Canine Leishmaniosis',                              nameTr: 'Şark Çıbanı / Leşmanya',                     species: 'dog', group: 'optional' },
  { code: 'DOG_LYME',       name: 'Lyme',                                              nameTr: 'Lyme Hastalığı',                              species: 'dog', group: 'optional' },
];

// ─── Kedi Aşıları ─────────────────────────────────────────────────
export const CAT_VACCINES: VaccineCatalogItem[] = [
  // Temel (Rutin) Aşılar
  { code: 'CAT_FPV',        name: 'Feline Panleukopenia',                              nameTr: 'Kedi Gençlik Hastalığı / Kanlı İshal (FPV)',  species: 'cat', group: 'core' },
  { code: 'CAT_FHV1',       name: 'Feline Herpesvirus Type 1 [Rhinotracheitis]',       nameTr: 'Kedi Nezlesi / Üst Solunum Yolu (FHV-1)',     species: 'cat', group: 'core' },
  { code: 'CAT_FCV',        name: 'Feline Calicivirus',                                nameTr: 'Kedi Kalisivirüsü / Ağız İçi Yaralar (FCV)',   species: 'cat', group: 'core' },
  { code: 'CAT_RABIES',     name: 'Rabies',                                            nameTr: 'Kuduz (RV)',                                  species: 'cat', group: 'core' },
  // Ek (Risk Durumuna Göre) Aşılar
  { code: 'CAT_FELV',       name: 'Feline Leukemia Virus',                             nameTr: 'Kedi Lösemisi (FeLV)',                        species: 'cat', group: 'optional' },
  { code: 'CAT_CHLAMYDIA',  name: 'Chlamydia felis',                                   nameTr: 'Kedi Klamidya Enfeksiyonu (Chlamydia)',        species: 'cat', group: 'optional' },
  { code: 'CAT_BORDETELLA', name: 'Bordetella bronchiseptica',                          nameTr: 'Kedi Solunum Yolu Bakterisi',                 species: 'cat', group: 'optional' },
  { code: 'CAT_FIV',        name: 'Feline Immunodeficiency Virus',                     nameTr: 'Kedi AIDS\'i (FIV)',                          species: 'cat', group: 'optional' },
  { code: 'CAT_FIP',        name: 'Feline Infectious Peritonitis',                     nameTr: 'FIP Aşısı',                                   species: 'cat', group: 'optional' },
];

// ─── Birleşik Katalog ─────────────────────────────────────────────
export const VACCINE_CATALOG: VaccineCatalogItem[] = [...DOG_VACCINES, ...CAT_VACCINES];

/**
 * Türe göre aşı listesi döndürür.
 * DB'de species 'Köpek' / 'Kedi' olarak tutulur, her iki formata da destek verir.
 * species null ise tüm listeyi döndürür.
 */
export function getVaccineCatalog(species: string | null): VaccineCatalogItem[] {
  if (!species) return VACCINE_CATALOG;
  const s = species.toLowerCase();
  if (s === 'dog' || s === 'köpek') return DOG_VACCINES;
  if (s === 'cat' || s === 'kedi') return CAT_VACCINES;
  return VACCINE_CATALOG;
}
