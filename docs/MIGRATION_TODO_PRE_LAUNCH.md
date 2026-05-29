# Lansman Öncesi Migration Listesi (Deferred)

Bu dosya, lansman öncesi Supabase Pro tier'a geçiş sonrasında toplu olarak uygulanacak ertelenmiş veritabanı değişikliklerini barındırır.

1. **`20260528000002_pet_journal_entries.sql`** (timestamp rename)
2. **`20260529000002_enforce_rls_priority_1.sql`** (full content, including the 'status=active' fix in public_read_lost_reports policy)
3. **`20260529000003_fix_journal_entry_types.sql`** ('appetite')

### 1. Kayıp İlanı Tekillik Koruması
- **Migration:** `lost_reports` DB partial unique index
- **Code:**
  ```sql
  CREATE UNIQUE INDEX idx_lost_reports_one_active_per_pet 
  ON public.lost_reports(pet_id) 
  WHERE status = 'active';
  ```
- **Sebep:** Race condition'a karşı aynı pet için birden fazla aktif kayıp ilanı açılmasını engeller.

### 2. Konum Doğrulama (lost_reports.last_seen_location)
- **Migration:** `lost_reports` last_seen_location length check
- **Code:**
  ```sql
  ALTER TABLE public.lost_reports 
  ADD CONSTRAINT chk_lost_reports_location_length 
  CHECK (char_length(trim(last_seen_location)) >= 5 AND char_length(last_seen_location) <= 500);
  ```
- **Sebep:** DB seviyesinde boşluk ("   ") veya çok kısa/çok uzun konum girişlerini engelleyerek son savunma hattını oluşturur.

### 3. Telefon Doğrulama (lost_reports.contact_phone)
- **Migration:** `lost_reports` contact_phone regex check
- **Code:**
  ```sql
  ALTER TABLE public.lost_reports 
  ADD CONSTRAINT chk_lost_reports_contact_phone 
  CHECK (contact_phone ~ '^\+?[0-9]{10,15}$');
  ```
- **Sebep:** Veritabanına geçersiz (örn: "asdfasdf") veya eksik/hatalı uzunlukta telefon formatlarının girilmesini engeller.

### 4. Tarih Doğrulama (lost_reports.last_seen_at)
- **Migration:** `lost_reports` last_seen_at future date check
- **Code:**
  ```sql
  ALTER TABLE public.lost_reports 
  ADD CONSTRAINT chk_lost_reports_last_seen_at 
  CHECK (last_seen_at <= NOW() + INTERVAL '1 minute');
  ```
- **Sebep:** Gelecekteki bir tarihte ("yarın kayboldu") veya hatalı timestamp girilmesini DB seviyesinde engeller (saat farkları için 1 dakika tolerans ile).
