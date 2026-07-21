BEGIN;

-- ==========================================
-- P1: parasite_records ↔ parasite_products bağlantısı
-- ==========================================
-- Kayıt, seçilen katalog ürününü işaret eder (provenans / analitik).
-- Nullable'dır çünkü kayıt üç biçimde oluşabilir:
--   1. Katalog ürünü seçilmiştir  → parasite_product_id dolu
--   2. Ürün elle girilmiştir      → NULL + brand/product_free_text
--   3. Ürün bilinmiyordur         → NULL
--
-- Bu FK süre kaynağı DEĞİLDİR: koruma süresi kayıt anında
-- protection_duration_days kolonuna snapshot olarak yazılır; katalogdaki
-- ürün sonradan değişse veya silinse (SET NULL) geçmiş kayıt bozulmaz.
-- Ürün-protokol uyum doğrulaması bilinçli olarak uygulama katmanındadır
-- (enum alfabeleri farklı: ürünlerde 'spot-on'/'both', kayıtlarda 'spot_on');
-- fn_validate_parasite_record trigger'ına dokunulmaz.

ALTER TABLE public.parasite_records
  ADD COLUMN IF NOT EXISTS parasite_product_id UUID NULL
    REFERENCES public.parasite_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parasite_records_product
  ON public.parasite_records(parasite_product_id);

COMMIT;
