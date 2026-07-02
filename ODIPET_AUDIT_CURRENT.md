# Odi.Pet Audit - Mevcut Durum

## Açık Sorunlar

1. **Yasal Zorunlu Aşı (Kuduz) Boşluğu**:
   `vaccination-algorithm.ts` dosyası şu an yalnızca `mandatory_level === 'core'` olan aşıları otomatik olarak planlıyor. Bu nedenle `legal_required` statüsündeki Kuduz aşısı (RABIES, RABIES_CAT) otomatik takvime asla girmiyor. Bunun kasıtlı olup olmadığı net değil; ancak yasal olarak zorunlu olduğu için ciddi bir boşluk (gap) oluşturuyor. Düzeltilmeyi bekliyor.
   *Not: api/insurance/[petId]/route.ts içindeki hasRabiesVaccine kontrolü, vaccine_records_v2'deki tamamlanmış kayıtlara bakıyor. Otomatik plan kuduz için hiç görev üretmediğinden, kullanıcı kuduz aşısını yaptırmış olsa bile sisteme hiç kaydetmemiş olabilir — bu da sigorta uygunluk hesabını yanlış etkileyebilir. Kuduz boşluğu düzeltilirken bu etkileşim de göz önünde bulundurulmalı.*

## Tamamlanan Temizlikler

1. **Legacy Aşı Tablolarının Silinmesi (DROP)**:
   * **Tarih**: 2026-07-02
   * **Uygulanan Migration**: [20260702145549_drop_legacy_vaccine_tables.sql](file:///c:/Odi.Pet/supabase/migrations/20260702145549_drop_legacy_vaccine_tables.sql)
   * **Detay**: Eski `public.vaccines` ve `public.vaccine_records` tabloları (tüm ilişkileriyle/cascade) production veritabanından tamamen silindi ve temizlendi.

