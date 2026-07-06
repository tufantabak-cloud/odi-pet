-- 20260706000003_parasite_products_collar_age.sql

-- Tasma minimum yaş alanını ekle
ALTER TABLE public.parasite_products
  ADD COLUMN IF NOT EXISTS min_age_weeks INTEGER;

COMMENT ON COLUMN public.parasite_products.min_age_weeks IS
  'Ürünün uygulanabileceği minimum yaş (hafta). NULL = kısıt yok. Tasma ürünleri için kritik: Seresto 7 hafta, Scalibor 12 hafta.';

-- Bilinen tasma kısıtlarını set et
UPDATE public.parasite_products
SET min_age_weeks = 7
WHERE name ILIKE '%Seresto%';

UPDATE public.parasite_products
SET min_age_weeks = 12
WHERE name ILIKE '%Scalibor%';
