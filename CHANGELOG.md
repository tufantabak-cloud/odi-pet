# Changelog

All notable changes to this project will be documented in this file.
## [Feature] Experience Orchestrator - Aylık Gelişim Modülü (2026-08-06)

### Added
- **Aylık Gelişim Kampanyası (SmartMonthlyGrowthPrompt):** Kullanıcıların her ay petlerinin gelişim fotoğraflarını zaman tüneline eklemelerini sağlayan yeni orkestratör modülü eklendi.
- **Dinamik Cooldown Engine:** `/evaluate` endpoint'inde sabit 7 gün (`weekAgo`) mantığı terk edilip, her kampanyanın kendi `cooldown_hours` değerini dinamik alan `lookbackHours` mekanizması getirildi.
- **Recurring Campaign Support:** `cooldown_rules.recurring === true` bayrağı desteklenerek kampanya tamamlanmış olsa bile süresi dolduğunda tekrar aktif olma özelliği eklendi.
- **Declarative Requires Desteği:** `requires` kural kümesine `no_gallery_photo_in_days` (zaman tüneli kontrolü) ve `gallery_quota_available` (kota denetimi) mekanizmaları eklendi.
- **Server-Side Quota Enforcement:** Galeri limiti ücretsiz kullanıcılar için 10'dan 5'e düşürüldü (SSOT: `galleryQuota.ts`). Backend tarafında IDOR ve Kota dolumu kontrolleri yapılarak 403 `gallery_quota_exceeded` güvenliği sağlandı.
- **GalleryTab Entegrasyonu:** 'growth_timeline' (Gelişim) sekmesi eklendi, paywall dinamik kota ile uyarlandı.

### Fixed (kod denetimi sonrası — 2026-08-06)
- **Migration UUID hatası:** Seed, `orchestrator_campaigns.id` / `orchestrator_prompts.id` (UUID) kolonlarına metin yazdığı için `22P02` ile başarısız oluyordu. Deterministik sabit UUID'lere geçildi; `ON CONFLICT DO UPDATE` yerine `DO NOTHING` kullanılarak admin panelinden yapılan ayarların her deploy'da ezilmesi engellendi.
- **`completed` analitiği erken yazılıyordu:** Kayıt artık YALNIZCA mutasyon başarıyla tamamlandıktan sonra yazılır. Reddedilen istekler (403/400/500) `failed_validation` olarak loglanır — böylece kota nedeniyle reddedilen kullanıcı 30 günlük cooldown'a girmez.
- **Tek seferlik kampanyaların "tamamlandı" kontrolü:** `completed` sorgusu artık lookback penceresinden bağımsız çalışıyor; pencere dışında kalan eski tamamlamalar nedeniyle kampanyanın tekrar gösterilmesi hatası giderildi.
- **Cooldown yalnızca gerçek etkileşimden başlar:** `shown` event'i cooldown başlatmaz; yalnızca `completed` / `dismissed` / `snoozed` dikkate alınır.
- **Hata yanıtları istemciye ulaşmıyordu:** `DynamicExperienceEngine.handleSubmit` artık `res.ok` kontrol edip hata fırlatıyor. Böylece prompt bileşenleri kota mesajını gösterebiliyor ve storage'daki yetim dosyayı temizleyebiliyor.
- **Storage whitelist sıkılaştırıldı:** `image_url` yalnızca `pet_gallery_bucket/${pet_id}/` önekiyle kabul ediliyor (önceden herhangi bir public bucket geçebiliyordu).
- **Kota kontrolü fail-closed:** Sayım sorgusu hata verirse yazma yapılmaz (500).
- **Dosya doğrulaması:** Prompt bileşeninde JPG/PNG/WEBP ve max 5 MB kontrolü eklendi.
- **`no_gallery_photo_in_days` NULL hatası:** `taken_at` NULL kayıtlar sorgudan hariç tutuldu (Postgres `DESC` varsayılanı NULLS FIRST olduğu için "fotoğraf yok" yanılgısı oluşuyordu).
- **`taken_at` gelecek tarih reddi** ve `caption` uzunluk sınırı (200) eklendi.
- **SSOT sızıntısı:** Premium limiti (200) artık `GALLERY_PHOTO_LIMIT_PREMIUM` üzerinden okunuyor.
- **Geriye dönük uyumluluk:** Ücretsiz limitin 10→5 düşmesi nedeniyle limit üstünde kalan kullanıcılara "planınız güncellendi, mevcut fotoğraflarınız korunuyor" mesajı gösteriliyor; fotoğraflar silinmiyor.
- **Testler:** `src/app/api/orchestrator/orchestrator.test.ts` içindeki 12 `it.todo` yerine 24 çalışan entegrasyon testi yazıldı (bellek içi Supabase taklidi: `src/app/api/orchestrator/testUtils.ts`).

---

## [Milestone] QA Priority 1 — Critical Bug & Security CLOSED (2026-05-29)

### Summary
Production-ready QA Priority 1 (Critical Bug & Security) tamamen 
kapatıldı. Beş alt madde, 5 senaryo, 4 yeni E2E test, 2 production-blocker 
bug yakalandı ve düzeltildi.

### Added
- E2E test: e2e/lost-pet-duplicate.spec.ts (race condition coverage)
- E2E test: e2e/lost-pet-validation.spec.ts (phone/date/location validation)
- E2E test: e2e/lost-pet-rls.spec.ts (unauthorized access prevention)
- E2E test: e2e/vet-guide-gps-denied.spec.ts (GPS permission edge cases)
- docs/MIGRATION_TODO_PRE_LAUNCH.md (5 pending migrations tracked)
- docs/PRE_LAUNCH_FEATURE_TODO.md (Public SOS redesign + feature gaps)

### Fixed
- TypeScript errors (TS2367, TS2554, TS2820, TS7031) → 0 compile errors
- Lost report duplicate prevention: .single() → .limit(1) (race-safe)
- Lost report contact_phone validation: regex on Frontend + API
- Lost report last_seen_at: defensive validation (future date check, 5y max)
- Vet Guide API error message: Turkish, charter-compliant
- Vet Guide GPS timeout: specific error message + maximumAge 60s
- manifest.ts maskable typing
- RLS policy mismatch: lost_reports public_read 'status=lost' → 'status=active'

### Reverted
- Public SOS page (/sos/[id]) — security issues (service_role exposure, 
  sensitive data leak in pets.* SELECT). Will be redesigned with team approval.

### Pending (Pre-Launch — Pro Tier required)
- 20260528000002_pet_journal_entries.sql (timestamp rename)
- 20260529000002_enforce_rls_priority_1.sql (family-sharing RLS + status=active fix)
- 20260529000003_fix_journal_entry_types.sql ('appetite' constraint)
- Partial unique index: lost_reports(pet_id) WHERE status='active'
- CHECK constraint: contact_phone regex
- CHECK constraint: last_seen_at not future

### Backups Created
- 15 CSV files (Supabase Dashboard manual export)
- 1.05 MB SQL pg_dump (DBeaver via Session Pooler)
- Both stored: Desktop/odi-pet-backup-2026-05-29 + Google Drive

## [Unreleased]

### Fixed
- **RLS Policy Fix**: Fixed `lost_reports` `public_read_lost_reports` policy. The condition `USING (status = 'lost')` was updated to `USING (status = 'active')` to match the exact schema DB CHECK constraint and API usage. This prevents a critical bug where SOS links would appear broken/empty to anonymous users scanning QR codes.

### Reverted
- **Public SOS page (/sos/[id])** — removed due to security issues (service_role exposure, sensitive data leak in pets.* SELECT, protected area violation). Will be redesigned with team approval.
