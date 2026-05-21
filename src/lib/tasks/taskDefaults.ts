export const TASK_CATEGORIES = [
  { id: 'Saglik',      label: 'Sağlık',      icon: '❤️' },
  { id: 'Medikal',     label: 'Aşı',         icon: '💉' },
  { id: 'Bakım',       label: 'Bakım',       icon: '🧼' },
  { id: 'Beslenme',    label: 'Beslenme',    icon: '🥣' },
  { id: 'Hijyen',      label: 'Hijyen',      icon: '🧹' },
  { id: 'Aktiviteler', label: 'Aktivite',    icon: '🦴' },
  { id: 'Veteriner',   label: 'Veteriner',   icon: '🐾' },
  { id: 'Diger',       label: 'Diğer',       icon: '📝' },
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number]['id'];

export interface SubCategoryItem {
  id: string;
  label: string;
  species?: ('Kedi' | 'Köpek')[]; // Optional: if undefined, shown for both
}

export const TASK_SUB_CATEGORIES: Record<TaskCategory, SubCategoryItem[]> = {
  Bakım: [
    { id: 'Banyo',           label: 'Banyo',                  species: ['Köpek'] },
    { id: 'Tüy Bakımı',      label: 'Tüy Bakımı' },
    { id: 'Kulak Temizliği', label: 'Kulak Temizliği' },
    { id: 'Diş Fırçalama',   label: 'Diş Fırçalama' },
    { id: 'Tırnak Kesimi',   label: 'Tırnak Kesimi' },
  ],
  Hijyen: [
    { id: 'Mama Kabı',  label: 'Mama Kabı Temizliği' },
    { id: 'Yatak',      label: 'Yatak Temizliği' },
    { id: 'Oyuncaklar', label: 'Oyuncak Temizliği' },
    { id: 'Su Pınarı',  label: 'Su Pınarı Temizliği' },
    { id: 'Tasma',      label: 'Tasma & Göğüslük Temizliği' },
    { id: 'Kum Kabı',   label: 'Kum Kabı Temizliği',    species: ['Kedi'] },
    { id: 'Tırmalama',  label: 'Tırmalama Tahtası',     species: ['Kedi'] },
    { id: 'Kafes',      label: 'Kafes / Taşıma Kutusu' },
  ],
  Aktiviteler: [
    { id: 'Yürüyüş', label: 'Yürüyüş',           species: ['Köpek'] },
    { id: 'Yarışma',  label: 'Yarışma / Gösteri' },
    { id: 'Eğitim',   label: 'Eğitim Seansı' },
    { id: 'Oyun',     label: 'Oyun Zamanı' },
  ],
  Medikal: [
    { id: 'Aşı',            label: 'Aşı Uygulaması' },
    { id: 'İç Parazit',     label: 'İç Parazit Koruması' },
    { id: 'Dış Parazit',    label: 'Dış Parazit Koruması' },
    { id: 'Parazit Tasması', label: 'Parazit Tasması' },
  ],
  Veteriner: [
    { id: 'Kontrol', label: 'Genel Kontrol' },
    { id: 'Acil',    label: 'Acil Durum' },
    { id: 'Takip',   label: 'Takip Randevusu' },
  ],
  Saglik: [
    { id: 'Kilo Takibi',      label: 'Kilo Ölçümü' },
    { id: 'Belirti Takibi',   label: 'Semptom & Belirti Takibi' },
    { id: 'İlaç',             label: 'İlaç Kullanımı' },
    { id: 'Tedavi/Pansuman',  label: 'Tedavi & Pansuman' },
    { id: 'Tahlil/Rapor',     label: 'Tahlil & Rapor' },
    { id: 'Kronik Takip',     label: 'Kronik Rahatsızlık Takibi' },
  ],
  Beslenme: [
    { id: 'Mama Siparişi', label: 'Mama Siparişi / Stok' },
    { id: 'Diyet Değişimi', label: 'Diyet Değişimi' },
  ],
  Diger: [
    { id: 'Diğer', label: 'Diğer' }
  ]
};

export const getFilteredSubCategories = (category: TaskCategory, species: string | null): SubCategoryItem[] => {
  const all = TASK_SUB_CATEGORIES[category] || [];
  if (!species) return all;

  const isDog = species.toLowerCase() === 'dog' || species.toLowerCase() === 'köpek';
  const isCat = species.toLowerCase() === 'cat' || species.toLowerCase() === 'kedi';

  return all.filter(item => {
    if (!item.species) return true;
    if (isDog && item.species.includes('Köpek')) return true;
    if (isCat && item.species.includes('Kedi')) return true;
    return false;
  });
};

export type SmartDefault = {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  notification_minutes: number;
};

// Smart defaults — Odi.Pet minimal clicks philosophy
// Tüm alt kategoriler kapsanmıştır; fallback: once/1/60
export const TASK_DEFAULTS: Record<string, SmartDefault> = {
  // ── Bakım ────────────────────────────────────────────────────────
  'Banyo':           { frequency: 'monthly', interval: 1, notification_minutes: 60 },
  'Tüy Bakımı':      { frequency: 'weekly',  interval: 1, notification_minutes: 30 },
  'Kulak Temizliği': { frequency: 'weekly',  interval: 2, notification_minutes: 30 },
  'Diş Fırçalama':   { frequency: 'weekly',  interval: 1, notification_minutes: 30 },
  'Tırnak Kesimi':   { frequency: 'monthly', interval: 1, notification_minutes: 60 },

  // ── Hijyen ───────────────────────────────────────────────────────
  'Mama Kabı':  { frequency: 'daily',   interval: 1, notification_minutes: 15 },
  'Yatak':      { frequency: 'monthly', interval: 1, notification_minutes: 60 },
  'Oyuncaklar': { frequency: 'monthly', interval: 1, notification_minutes: 60 },
  'Su Pınarı':  { frequency: 'weekly',  interval: 1, notification_minutes: 30 },
  'Tasma':      { frequency: 'monthly', interval: 1, notification_minutes: 60 },
  'Kum Kabı':   { frequency: 'daily',   interval: 1, notification_minutes: 30 },
  'Tırmalama':  { frequency: 'monthly', interval: 1, notification_minutes: 60 },
  'Kafes':      { frequency: 'monthly', interval: 1, notification_minutes: 60 },

  // ── Aktiviteler ──────────────────────────────────────────────────
  'Yürüyüş': { frequency: 'daily',   interval: 1, notification_minutes: 15 },
  'Yarışma':  { frequency: 'once',   interval: 1, notification_minutes: 1440 }, // etkinlik → tek seferlik, 1 gün önce
  'Eğitim':   { frequency: 'weekly', interval: 1, notification_minutes: 30 },
  'Oyun':     { frequency: 'daily',  interval: 1, notification_minutes: 15 },

  // ── Medikal ──────────────────────────────────────────────────────
  'Aşı':             { frequency: 'yearly',  interval: 1, notification_minutes: 1440 },
  'İç Parazit':      { frequency: 'monthly', interval: 3, notification_minutes: 1440 },
  'Dış Parazit':     { frequency: 'monthly', interval: 2, notification_minutes: 1440 },
  'Parazit Tasması': { frequency: 'monthly', interval: 3, notification_minutes: 1440 },

  // ── Veteriner ────────────────────────────────────────────────────
  'Kontrol': { frequency: 'yearly', interval: 1, notification_minutes: 1440 },
  'Acil':    { frequency: 'once',   interval: 1, notification_minutes: 15 },   // acil → tek seferlik
  'Takip':   { frequency: 'once',   interval: 1, notification_minutes: 1440 }, // takip → tek seferlik, 1 gün önce

  // ── Sağlık ───────────────────────────────────────────────────────
  'Kilo Takibi':     { frequency: 'monthly', interval: 1, notification_minutes: 1440 },
  'Belirti Takibi':  { frequency: 'weekly',  interval: 1, notification_minutes: 60 },
  'İlaç':            { frequency: 'daily',   interval: 1, notification_minutes: 15 },
  'Tedavi/Pansuman': { frequency: 'daily',   interval: 1, notification_minutes: 60 },
  'Tahlil/Rapor':    { frequency: 'once',    interval: 1, notification_minutes: 60 },
  'Kronik Takip':    { frequency: 'monthly', interval: 1, notification_minutes: 1440 },

  // ── Beslenme ─────────────────────────────────────────────────────
  'Mama Siparişi':  { frequency: 'monthly', interval: 1, notification_minutes: 1440 },
  'Diyet Değişimi': { frequency: 'once',    interval: 1, notification_minutes: 60 },
};

export const getSmartDefault = (subCategory: string): SmartDefault => {
  return TASK_DEFAULTS[subCategory] || { frequency: 'once', interval: 1, notification_minutes: 60 };
};
