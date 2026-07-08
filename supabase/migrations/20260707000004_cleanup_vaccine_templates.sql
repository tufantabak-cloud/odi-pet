-- vaccine_templates temizliği
-- Ön koşul doğrulaması:
--   routine kontrolü: boş ✅
--   FK kontrolü: sadece vaccine_records_v2.template_id → silinecek ✅  
--   kullanım: 0 satır ✅

-- 1. Önce FK bağını kes
ALTER TABLE vaccine_records_v2
  DROP COLUMN IF EXISTS template_id;

-- 2. Artık FK'sı kalmayan tabloyu sil
DROP TABLE IF EXISTS vaccine_templates;
