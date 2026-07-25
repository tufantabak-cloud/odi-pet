import { CategoryGroup, TaskRow } from '../types';

/** Health-tracker kategori anahtarı → /owner/plan-yap/[kategori] route parametresi */
const CATEGORY_ROUTE_KEY: Record<string, string> = {
  Saglik: 'saglik',
  Kontrol: 'kontrol',
  Asi: 'asi',
  Parazit: 'parazit',
  'Bakım': 'bakim',
  Beslenme: 'beslenme',
  Hijyen: 'hijyen',
  Aktivite: 'aktivite',
};

/**
 * mapDbToUI çıktısındaki UI alt kategori etiketini wizard'ın (taskDefaults.ts)
 * ham subCategory id'sine çevirir. Yalnızca statik, bire bir bilinen
 * eşlemeler içerir — eşleşme yoksa alt kategori adımı atlanmaz, kullanıcı
 * kendisi seçer (güvenli fallback).
 */
const UI_SUBCATEGORY_TO_WIZARD_ID: Record<string, string> = {
  'Kilo Ölçümü': 'Kilo Takibi',
  'Semptom & Belirti Takibi': 'Belirti Takibi',
  'İlaç Kullanımı': 'İlaç',
  'Tedavi & Pansuman': 'Tedavi/Pansuman',
  'Tahlil & Rapor': 'Tahlil/Rapor',
  'Kronik Rahatsızlık Takibi': 'Kronik Takip',
  'Alerji Kaydı': 'Alerji',
  'Banyo': 'Banyo',
  'Tüy Bakımı': 'Tüy Bakımı',
  'Kulak Temizliği': 'Kulak Temizliği',
  'Diş Fırçalama': 'Diş Fırçalama',
  'Tırnak Kesimi': 'Tırnak Kesimi',
  'Mama Kabı Temizliği': 'Mama Kabı',
  'Yatak Temizliği': 'Yatak',
  'Oyuncak Temizliği': 'Oyuncaklar',
  'Su Pınarı Temizliği': 'Su Pınarı',
  'Tasma & Göğüslük Temizliği': 'Tasma',
  'Çiş Pedi Temizliği & Değişimi': 'Çiş Pedi',
  'Kum Kabı Temizliği': 'Kum Kabı',
  'Kum Değişimi & Yıkama': 'Kum Değişimi',
  'Kafes / Taşıma Kutusu': 'Kafes',
  'Ev & Ortam Hijyeni': 'Ortam Hijyeni',
  'Yürüyüş': 'Yürüyüş',
  'Dışarı Tuvalet Eğitimi': 'Köpek Tuvalet',
  'Kedi Tuvalet Eğitimi': 'Kedi Tuvalet',
  'Yarışma / Gösteri': 'Yarışma',
  'Eğitim Seansı': 'Eğitim',
  'Oyun Zamanı': 'Oyun',
  'Mama Siparişi / Stok': 'Mama Siparişi',
  'Diyet Değişimi': 'Diyet Değişimi',
  'Genel Kontrol': 'Kontrol',
  'Acil Durum': 'Acil',
  'Takip Randevusu': 'Takip',
  'İç Parazit Uygulaması': 'İç Parazit',
  'Dış Parazit Uygulaması': 'Dış Parazit',
  'Parazit Tasması': 'Parazit Tasması',
};

/**
 * Timeline'da boş bir tarih hücresine tıklanınca, o görev satırı ve tarih
 * için "plan yap" sihirbazını doğru kategori/alt kategori/tarihle önceden
 * doldurulmuş şekilde açacak URL'i üretir.
 */
export function buildPlanYapHref(
  petId: string,
  group: CategoryGroup,
  row: TaskRow,
  dateKey: string,
): string | null {
  if (
    row.uiSubCategory === 'Kilo Takibi' ||
    row.uiSubCategory === 'Kilo Ölçümü' ||
    row.uiSubCategory === 'Kilo & Boy Ölçümü' ||
    row.task.title.includes('Kilo')
  ) {
    return `/owner/pets/${petId}/nutrition?tab=kilo`;
  }

  const routeKey = CATEGORY_ROUTE_KEY[group.category];
  if (!routeKey) return null;

  const params = new URLSearchParams();
  params.set('pet_id', petId);
  params.set('date', dateKey);

  // Aşı: subCategory adımı zaten atlanıyor (wizard doğrudan ürün seçimine gider) —
  // spesifik aşıyı adından otomatik seçtirmeyi dene.
  if (group.category === 'Asi') {
    params.set('vaccineName', row.task.title);
    return `/owner/plan-yap/${routeKey}?${params.toString()}`;
  }

  const wizardSubCat = row.uiSubCategory ? UI_SUBCATEGORY_TO_WIZARD_ID[row.uiSubCategory] : undefined;
  if (wizardSubCat) params.set('subCat', wizardSubCat);

  // Parazit: ürün seçimi adımı var — ürün adını otomatik seçtirmeyi dene.
  if (group.category === 'Parazit') {
    params.set('vaccineName', row.task.title);
  }

  // İlaç Kullanımı: ilaç adı ayrı bir alan (medication_name), satır başlığı zaten o isim.
  if (row.uiSubCategory === 'İlaç Kullanımı') {
    params.set('medName', row.task.title);
  }

  return `/owner/plan-yap/${routeKey}?${params.toString()}`;
}
