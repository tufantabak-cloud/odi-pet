-- 20260706000002_parasite_products_ear_mites.sql

-- covers_ear_mites alanını ekle
ALTER TABLE public.parasite_products
  ADD COLUMN IF NOT EXISTS covers_ear_mites BOOLEAN NOT NULL DEFAULT false;

-- active_ingredient içeriğine göre otomatik set et
UPDATE public.parasite_products
SET covers_ear_mites = true
WHERE
  active_ingredient ILIKE '%Moksidektin%'
  OR active_ingredient ILIKE '%Selamektin%'
  OR active_ingredient ILIKE '%Fluralaner%'
  OR active_ingredient ILIKE '%Sarolaner%'
  OR active_ingredient ILIKE '%Afoxolaner%';

-- Açıklayıcı yorum
COMMENT ON COLUMN public.parasite_products.covers_ear_mites IS
  'Ürün kulak uyuzunu (Otodectes cynotis) kapsar mı? active_ingredient LIKE eşleşmesiyle otomatik set edilir.';
