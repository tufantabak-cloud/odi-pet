-- ============================================================================
-- Migration: 20260723220000_food_catalog_and_assignments.sql
-- Beslenme Faz 1A.2.1: Mama Kataloğu, Pet–Mama Veri Sözleşmesi ve Tarihsel Backfill Düzeltmesi
-- ============================================================================

-- ─── 1. KATALOG TABLOLARI ───────────────────────────────────────────────────

-- A) food_manufacturers
CREATE TABLE IF NOT EXISTS public.food_manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  country_code TEXT,
  official_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  source_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B) food_brands
CREATE TABLE IF NOT EXISTS public.food_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID REFERENCES public.food_manufacturers(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  official_tr_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  source_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C) food_brand_aliases
CREATE TABLE IF NOT EXISTS public.food_brand_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.food_brands(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D) food_product_families
CREATE TABLE IF NOT EXISTS public.food_product_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.food_brands(id) ON DELETE CASCADE,
  official_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('cat', 'dog', 'both')),
  food_form TEXT NOT NULL CHECK (food_form IN (
    'dry', 'wet_pate', 'wet_gravy', 'wet_jelly', 'broth',
    'semi_moist', 'freeze_dried', 'air_dried', 'raw_frozen', 'fresh_cooked', 'other'
  )),
  nutritional_role TEXT NOT NULL CHECK (nutritional_role IN (
    'complete', 'complementary', 'dietetic_complete',
    'dietetic_complementary', 'treat', 'milk_replacer', 'supplement'
  )),
  life_stage TEXT NOT NULL CHECK (life_stage IN (
    'growth', 'adult', 'gestation_lactation',
    'all_life_stages', 'senior_manufacturer_defined', 'unspecified'
  )),
  target_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  primary_proteins TEXT[] NOT NULL DEFAULT '{}'::text[],
  marketing_claims TEXT[] NOT NULL DEFAULT '{}'::text[],
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  source_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_brand_family_normalized UNIQUE (brand_id, normalized_name)
);

-- E) food_skus
CREATE TABLE IF NOT EXISTS public.food_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_family_id UUID NOT NULL REFERENCES public.food_product_families(id) ON DELETE CASCADE,
  gtin TEXT,
  package_size_grams NUMERIC NOT NULL CHECK (package_size_grams > 0),
  package_type TEXT,
  manufacturer_product_code TEXT,
  country_of_origin TEXT,
  market_status TEXT NOT NULL DEFAULT 'active' CHECK (market_status IN ('active', 'inactive', 'unknown')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  source_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_food_skus_gtin_valid CHECK (gtin IS NULL OR (gtin ~ '^[0-9]+$' AND length(gtin) IN (8, 12, 13, 14)))
);

-- GTIN Partial Unique Index (NonNull GTIN unique olmalı)
CREATE UNIQUE INDEX IF NOT EXISTS idx_food_skus_gtin_unique ON public.food_skus (gtin) WHERE gtin IS NOT NULL;

-- F) food_label_versions
CREATE TABLE IF NOT EXISTS public.food_label_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_sku_id UUID NOT NULL REFERENCES public.food_skus(id) ON DELETE CASCADE,
  version_label TEXT,
  ingredients_raw TEXT,
  analytical_constituents JSONB NOT NULL DEFAULT '{}'::jsonb,
  additives_raw TEXT,
  energy_kcal_per_kg NUMERIC CHECK (energy_kcal_per_kg IS NULL OR energy_kcal_per_kg > 0),
  feeding_guide JSONB NOT NULL DEFAULT '{}'::jsonb,
  label_front_url TEXT,
  label_back_url TEXT,
  source_url TEXT,
  valid_from DATE,
  valid_to DATE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_label_versions_valid_dates CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);


-- ─── 2. PET–MAMA KULLANIM TABLOSU ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pet_food_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  food_product_family_id UUID REFERENCES public.food_product_families(id) ON DELETE SET NULL,
  food_sku_id UUID REFERENCES public.food_skus(id) ON DELETE SET NULL,
  brand_free_text TEXT,
  product_free_text TEXT,
  food_form TEXT NOT NULL CHECK (food_form IN (
    'dry', 'wet_pate', 'wet_gravy', 'wet_jelly', 'broth',
    'semi_moist', 'freeze_dried', 'air_dried', 'raw_frozen', 'fresh_cooked', 'other'
  )),
  daily_target_grams NUMERIC CHECK (daily_target_grams IS NULL OR daily_target_grams > 0),
  meals_per_day INT CHECK (meals_per_day IS NULL OR (meals_per_day >= 1 AND meals_per_day <= 24)),
  started_at DATE NOT NULL,
  ended_at DATE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  measurement_method TEXT NOT NULL CHECK (measurement_method IN (
    'planned_estimate', 'owner_confirmed', 'package_scan', 'admin_verified', 'legacy_profile'
  )),
  source TEXT NOT NULL CHECK (source IN ('catalog', 'manual', 'scanner', 'migration')),
  legacy_profile_id UUID UNIQUE REFERENCES public.pet_nutrition_profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_assignments_dates CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT chk_assignments_has_info CHECK (
    (food_product_family_id IS NOT NULL) OR 
    (brand_free_text IS NOT NULL OR product_free_text IS NOT NULL)
  )
);

-- Partial Unique Index: Aynı pet için aynı anda en fazla bir aktif is_primary kayıt olabilir.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pet_food_assignments_single_active_primary
  ON public.pet_food_assignments (pet_id)
  WHERE is_primary = true AND ended_at IS NULL;

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_pet_food_assignments_pet_id ON public.pet_food_assignments (pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_food_assignments_family ON public.pet_food_assignments (food_product_family_id);


-- ─── 3. DOĞRULAMA TETİKLEYİCİLERİ ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_pet_food_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_pet_species TEXT;
  v_family_species TEXT;
  v_family_active BOOLEAN;
  v_family_status TEXT;
  v_family_form TEXT;
  v_sku_family_id UUID;
  v_sku_status TEXT;
  v_sku_market TEXT;
BEGIN
  -- 1. Pet Varlık ve Species Kontrolü
  SELECT species INTO v_pet_species FROM public.pets WHERE id = NEW.pet_id;
  IF v_pet_species IS NULL THEN
    RAISE EXCEPTION 'InvalidPet: Pet with ID % does not exist', NEW.pet_id;
  END IF;

  -- 2. SKU Doğrulaması (varsa)
  IF NEW.food_sku_id IS NOT NULL THEN
    SELECT product_family_id, verification_status, market_status
      INTO v_sku_family_id, v_sku_status, v_sku_market
      FROM public.food_skus
      WHERE id = NEW.food_sku_id;

    IF v_sku_family_id IS NULL THEN
      RAISE EXCEPTION 'InvalidCatalogSku: SKU % does not exist', NEW.food_sku_id;
    END IF;

    IF v_sku_status <> 'verified' OR v_sku_market <> 'active' THEN
      RAISE EXCEPTION 'InvalidCatalogSku: SKU % is not active or verified (status: %, market: %)', NEW.food_sku_id, v_sku_status, v_sku_market;
    END IF;

    -- SKU'nun bağlı olduğu family ile assignment family uyuşmalı (veya boşsa otomatik atanmalı)
    IF NEW.food_product_family_id IS NULL THEN
      NEW.food_product_family_id := v_sku_family_id;
    ELSIF NEW.food_product_family_id <> v_sku_family_id THEN
      RAISE EXCEPTION 'MismatchedSkuFamily: SKU product_family_id (%) does not match assignment food_product_family_id (%)', v_sku_family_id, NEW.food_product_family_id;
    END IF;
  END IF;

  -- 3. Ürün Ailesi Doğrulaması (varsa)
  IF NEW.food_product_family_id IS NOT NULL THEN
    SELECT species, is_active, verification_status, food_form
      INTO v_family_species, v_family_active, v_family_status, v_family_form
      FROM public.food_product_families
      WHERE id = NEW.food_product_family_id;

    IF v_family_species IS NULL THEN
      RAISE EXCEPTION 'InvalidCatalogProduct: Product family % does not exist', NEW.food_product_family_id;
    END IF;

    IF NOT v_family_active OR v_family_status <> 'verified' THEN
      RAISE EXCEPTION 'InvalidCatalogProduct: Product family % is not active or verified (active: %, status: %)', NEW.food_product_family_id, v_family_active, v_family_status;
    END IF;

    -- Pet species ile Uyum Kontrolü
    IF v_family_species <> 'both' AND v_family_species <> v_pet_species THEN
      RAISE EXCEPTION 'MismatchedSpecies: Product family species (%) does not match pet species (%)', v_family_species, v_pet_species;
    END IF;

    -- Katalog ürün aydınlatması: food_form katalogdan eşleşmeli/birebir aynı olmalı
    IF NEW.food_form IS NULL OR NEW.food_form <> v_family_form THEN
      NEW.food_form := v_family_form;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_pet_food_assignment ON public.pet_food_assignments;
CREATE TRIGGER trg_validate_pet_food_assignment
  BEFORE INSERT OR UPDATE ON public.pet_food_assignments
  FOR EACH ROW EXECUTE FUNCTION public.validate_pet_food_assignment();


-- ─── 4. SIKILAŞTIRILMIŞ RLS POLİTİKALARI ───────────────────────────────────

ALTER TABLE public.food_manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_brand_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_product_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_label_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_food_assignments ENABLE ROW LEVEL SECURITY;

-- 4.1 KATALOG OKUMA POLİTİKALARI (Sadece Verified + Active Zinciri)

DROP POLICY IF EXISTS "Authenticated users read verified active manufacturers" ON public.food_manufacturers;
CREATE POLICY "Authenticated users read verified active manufacturers" ON public.food_manufacturers
  FOR SELECT TO authenticated
  USING (is_active = true AND verification_status = 'verified');

DROP POLICY IF EXISTS "Authenticated users read verified active brands" ON public.food_brands;
CREATE POLICY "Authenticated users read verified active brands" ON public.food_brands
  FOR SELECT TO authenticated
  USING (
    is_active = true AND verification_status = 'verified' AND (
      manufacturer_id IS NULL OR EXISTS (
        SELECT 1 FROM public.food_manufacturers m
        WHERE m.id = food_brands.manufacturer_id AND m.is_active = true AND m.verification_status = 'verified'
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users read verified brand aliases" ON public.food_brand_aliases;
CREATE POLICY "Authenticated users read verified brand aliases" ON public.food_brand_aliases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.food_brands b
      WHERE b.id = food_brand_aliases.brand_id AND b.is_active = true AND b.verification_status = 'verified'
    )
  );

DROP POLICY IF EXISTS "Authenticated users read verified active product families" ON public.food_product_families;
CREATE POLICY "Authenticated users read verified active product families" ON public.food_product_families
  FOR SELECT TO authenticated
  USING (
    is_active = true AND verification_status = 'verified' AND EXISTS (
      SELECT 1 FROM public.food_brands b
      WHERE b.id = food_product_families.brand_id AND b.is_active = true AND b.verification_status = 'verified'
    )
  );

DROP POLICY IF EXISTS "Authenticated users read verified active skus" ON public.food_skus;
CREATE POLICY "Authenticated users read verified active skus" ON public.food_skus
  FOR SELECT TO authenticated
  USING (
    market_status = 'active' AND verification_status = 'verified' AND EXISTS (
      SELECT 1 FROM public.food_product_families pf
      JOIN public.food_brands b ON b.id = pf.brand_id
      WHERE pf.id = food_skus.product_family_id
        AND pf.is_active = true AND pf.verification_status = 'verified'
        AND b.is_active = true AND b.verification_status = 'verified'
    )
  );

DROP POLICY IF EXISTS "Authenticated users read verified label versions" ON public.food_label_versions;
CREATE POLICY "Authenticated users read verified label versions" ON public.food_label_versions
  FOR SELECT TO authenticated
  USING (
    verification_status = 'verified' AND EXISTS (
      SELECT 1 FROM public.food_skus s
      JOIN public.food_product_families pf ON pf.id = s.product_family_id
      JOIN public.food_brands b ON b.id = pf.brand_id
      WHERE s.id = food_label_versions.food_sku_id
        AND s.market_status = 'active' AND s.verification_status = 'verified'
        AND pf.is_active = true AND pf.verification_status = 'verified'
        AND b.is_active = true AND b.verification_status = 'verified'
    )
  );

-- 4.2 ADMIN/FOUNDER KATALOG YAZMA POLİTİKALARI (Kanonik role IN ('admin', 'founder'))

DROP POLICY IF EXISTS "Admins write food manufacturers" ON public.food_manufacturers;
CREATE POLICY "Admins write food manufacturers" ON public.food_manufacturers
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'founder'))
  );

DROP POLICY IF EXISTS "Admins write food brands" ON public.food_brands;
CREATE POLICY "Admins write food brands" ON public.food_brands
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'founder'))
  );

DROP POLICY IF EXISTS "Admins write food brand aliases" ON public.food_brand_aliases;
CREATE POLICY "Admins write food brand aliases" ON public.food_brand_aliases
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'founder'))
  );

DROP POLICY IF EXISTS "Admins write food product families" ON public.food_product_families;
CREATE POLICY "Admins write food product families" ON public.food_product_families
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'founder'))
  );

DROP POLICY IF EXISTS "Admins write food skus" ON public.food_skus;
CREATE POLICY "Admins write food skus" ON public.food_skus
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'founder'))
  );

DROP POLICY IF EXISTS "Admins write food label versions" ON public.food_label_versions;
CREATE POLICY "Admins write food label versions" ON public.food_label_versions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'founder'))
  );

-- 4.3 PET FOOD ASSIGNMENTS RLS (Owner-only)

DROP POLICY IF EXISTS "Owners manage pet food assignments" ON public.pet_food_assignments;
CREATE POLICY "Owners manage pet food assignments" ON public.pet_food_assignments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_food_assignments.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_food_assignments.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );


-- ─── 5. GÜVENLİ VE TARİHSEL MİGRASYON BACKFILL FONKSİYONU ──────────────────

CREATE OR REPLACE FUNCTION public.backfill_pet_nutrition_profiles_to_assignments()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
  v_form TEXT;
  v_existing_started_at DATE;
  v_started_at DATE;
  v_ended_at DATE;
BEGIN
  FOR r IN SELECT * FROM public.pet_nutrition_profiles LOOP
    -- food_type -> food_form mapping
    CASE r.food_type
      WHEN 'dry' THEN v_form := 'dry';
      WHEN 'wet' THEN v_form := 'wet_pate';
      WHEN 'raw' THEN v_form := 'raw_frozen';
      ELSE v_form := 'other';
    END CASE;

    v_started_at := COALESCE(r.created_at::date, CURRENT_DATE);

    -- Pet için halihazırda aktif bir primary mama var mı kontrol et
    SELECT started_at INTO v_existing_started_at
      FROM public.pet_food_assignments
      WHERE pet_id = r.pet_id AND is_primary = true AND ended_at IS NULL
      LIMIT 1;

    -- Eğer petin halihazırda aktif bir primary maması varsa:
    -- Legacy kaydı "Geçmiş (Historical)" kapalı primary kayıt olarak aktar (ended_at NOT NULL).
    IF v_existing_started_at IS NOT NULL THEN
      IF v_started_at >= v_existing_started_at THEN
        v_ended_at := v_started_at;
      ELSE
        v_ended_at := v_existing_started_at - INTERVAL '1 day';
      END IF;
    ELSE
      v_ended_at := NULL;
    END IF;

    INSERT INTO public.pet_food_assignments (
      pet_id,
      brand_free_text,
      product_free_text,
      food_form,
      daily_target_grams,
      meals_per_day,
      started_at,
      ended_at,
      is_primary,
      measurement_method,
      source,
      legacy_profile_id,
      created_at,
      updated_at
    ) VALUES (
      r.pet_id,
      r.food_brand,
      r.food_product,
      v_form,
      r.daily_grams,
      r.meals_per_day,
      v_started_at,
      v_ended_at,
      true, -- Her zaman primary role taşıyabilir ancak ended_at NOT NULL olduğu için tarihsel kapanmıştır
      'legacy_profile',
      'migration',
      r.id,
      COALESCE(r.created_at, NOW()),
      COALESCE(r.updated_at, NOW())
    ) ON CONFLICT (legacy_profile_id) DO NOTHING;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Güvenlik sıkılaştırma: Dışarıdan yetkisiz kullanıcılar fonksiyonu tetikleyemesin
REVOKE EXECUTE ON FUNCTION public.backfill_pet_nutrition_profiles_to_assignments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_pet_nutrition_profiles_to_assignments() TO service_role;

-- Migration çalıştırma esnasında 1 defa çalıştır
SELECT public.backfill_pet_nutrition_profiles_to_assignments();
