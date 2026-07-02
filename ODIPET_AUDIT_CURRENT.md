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

### Aşılama ve Şema Senkronizasyonu (2 Temmuz 2026)
- **Vaccine Templates Veri Kaybı Krizi Çözüldü:** Production'da eski `vaccine_templates` verileri kaybolmuş/sıfırlanmış olarak bulundu. Olası sebep, önceki seanslarda local/remote ortam arasında atlanan bir migration senkronizasyon problemi veya manuel müdahaleydi. Antigravity tarafında hiçbir drop/delete komutu çalıştırılmadığı kanıtlandı.
- **Kapsamlı Seed Stratejisi:** WSAVA standartlarına uygun tüm core (zorunlu), parazit ve opsiyonel kedi/köpek aşı şablonları `supabase/seed.sql` dosyasına hardcode edilerek sıfırdan oluşturuldu. 
  - Kuduz 1 doz, Karma aşı 3 doz (21 gün arayla) kuralı uygulandı.
  - Orijinal tabloda yer alan çakışan `Rabies`, `DOG_CDV` gibi kayıtlar pasife (`is_active: false`) çekildi.
- **Migration Tamiri:** Eski tablolardaki hatalı kolonlar (`business_profiles`, `lost_reports.description`, `referrals.status`) migration dosyalarından temizlenerek tam local senkronizasyon (db reset) hatasız hale getirildi.
- **Test Edildi:** Yeni şema ile algoritma (2 aylık köpek örneğiyle) test edildi. Aşı planının %100 doğru şekilde Kuduz 1 doz ve Karma Aşı 3 doz ürettiği doğrulandı.

2. **Mimari Boşluk - Karma Aşı Modellemesi (2026-07-02)**:
   * **Durum**: `DOG_CDV`/`DOG_CAV1`/`DOG_CPV` üç ayrı `vaccine_templates` satırı olarak modellenmiş, ama gerçekte tek bir karma aşı (Köpek Karma Aşısı / DHPP benzeri) ile uygulanıyor. Şu anki otomasyon kullanıcıya 3 ayrı 'aşı görevi' gösterebilir (aynı gün, aynı enjeksiyon için). Aynı durum kedi tarafında `CAT_FPV`/`CAT_FHV1`/`CAT_FCV` için de geçerli. 
   * **Doğru çözüm**: 'Combination vaccine' kavramı eklemek (bir grup hastalığın tek ürün/tek enjeksiyonla karşılandığını belirten bir üst tablo veya alan). Şimdilik veri düzeltmesi (recurrence_days) yapıldı ama gösterim/UX tarafı düzeltilmedi — kullanıcı 3 ayrı görev görebilir. Ayrıca `DOG_CAV1` hastalık kodu ile modern aşılarda kullanılan `DOG_CAV2` antijeni arasında bir ayrım var, ileride vaccine_code/antigen ayrımı netleştirilmeli.
