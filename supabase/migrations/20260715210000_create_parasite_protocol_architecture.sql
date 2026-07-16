BEGIN;

-- ==========================================
-- 0. Şema Ön Kontrolü (Schema Pre-check)
-- ==========================================
DO $$
DECLARE
    role_col_exists BOOLEAN;
    pet_id_col_exists BOOLEAN;
    profile_id_col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) INTO role_col_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'pet_owners' AND column_name = 'pet_id'
    ) INTO pet_id_col_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'pet_owners' AND column_name = 'profile_id'
    ) INTO profile_id_col_exists;

    IF NOT role_col_exists THEN
        RAISE EXCEPTION 'Şema kontrolü başarisiz: "public.profiles" tablosunda "role" kolonu bulunamadi.';
    END IF;

    IF NOT pet_id_col_exists THEN
        RAISE EXCEPTION 'Şema kontrolü başarisiz: "public.pet_owners" tablosunda "pet_id" kolonu bulunamadi.';
    END IF;

    IF NOT profile_id_col_exists THEN
        RAISE EXCEPTION 'Şema kontrolü başarisiz: "public.pet_owners" tablosunda "profile_id" kolonu bulunamadi.';
    END IF;
END $$;

-- ==========================================
-- 1. Yöntem Doğrulama Fonksiyonu (IMMUTABLE)
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_valid_method_array(arr text[])
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT 
    arr IS NOT NULL 
    AND cardinality(arr) > 0 
    AND array_position(arr, NULL) IS NULL
    AND NOT EXISTS (SELECT 1 FROM unnest(arr) x WHERE x <> btrim(x) OR x <> lower(x))
    AND arr <@ ARRAY['spot_on', 'oral', 'collar', 'injection', 'spray', 'shampoo', 'other']::text[]
    AND cardinality(arr) = (SELECT count(DISTINCT x) FROM unnest(arr) x);
$$;

-- ==========================================
-- 2. parasite_protocols
-- ==========================================
CREATE TABLE IF NOT EXISTS public.parasite_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parasite_code TEXT NOT NULL CHECK (
        parasite_code = btrim(parasite_code) 
        AND parasite_code ~ '^[A-Z0-9_]+$'
    ),
    protocol_name TEXT NOT NULL CHECK (btrim(protocol_name) <> ''),
    parasite_type TEXT NOT NULL CHECK (parasite_type IN ('internal', 'external', 'combined', 'collar')),
    species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
    default_protection_duration_days INTEGER NOT NULL CHECK (default_protection_duration_days > 0),
    allowed_application_methods TEXT[] NOT NULL CHECK (public.is_valid_method_array(allowed_application_methods)),
    default_application_method TEXT NOT NULL CHECK (
        btrim(default_application_method) <> '' 
        AND default_application_method IN ('spot_on', 'oral', 'collar', 'injection', 'spray', 'shampoo', 'other')
    ),
    min_age_weeks INTEGER NULL CHECK (min_age_weeks >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT parasite_protocols_code_species_key UNIQUE(parasite_code, species)
);

-- Idempotent constraint addition for default_application_method
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'parasite_protocols_default_method_check' 
        AND conrelid = 'public.parasite_protocols'::regclass
    ) THEN
        ALTER TABLE public.parasite_protocols 
        ADD CONSTRAINT parasite_protocols_default_method_check 
        CHECK (default_application_method = ANY(allowed_application_methods));
    END IF;
END $$;

-- ==========================================
-- 3. pet_parasite_preferences
-- ==========================================
CREATE TABLE IF NOT EXISTS public.pet_parasite_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    parasite_protocol_id UUID NOT NULL REFERENCES public.parasite_protocols(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pet_parasite_preferences_pet_protocol_key UNIQUE(pet_id, parasite_protocol_id)
);

-- ==========================================
-- 4. parasite_records
-- ==========================================
CREATE TABLE IF NOT EXISTS public.parasite_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    parasite_protocol_id UUID NULL REFERENCES public.parasite_protocols(id) ON DELETE SET NULL,
    parasite_code TEXT NOT NULL CHECK (btrim(parasite_code) <> ''),
    parasite_type TEXT NOT NULL CHECK (parasite_type IN ('internal', 'external', 'combined', 'collar')),
    administered_at DATE NOT NULL,
    brand_free_text TEXT NULL,
    product_free_text TEXT NULL,
    application_method TEXT NOT NULL CHECK (btrim(application_method) <> ''),
    protection_duration_days INTEGER NOT NULL CHECK (protection_duration_days > 0),
    notes TEXT NULL,
    document_storage_path TEXT NULL,
    source_plan_item_id UUID NULL REFERENCES public.parasite_plan_items(id) ON DELETE SET NULL,
    plan_id UUID NULL REFERENCES public.plans(id) ON DELETE SET NULL,
    source TEXT NOT NULL CHECK (source IN ('user_manual', 'plan_completion', 'migration', 'scanner')),
    created_by UUID NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT parasite_records_source_plan_item_key UNIQUE(source_plan_item_id)
);

-- ==========================================
-- 5. Indexler
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_parasite_protocols_search ON public.parasite_protocols(parasite_type, species, is_active);
CREATE INDEX IF NOT EXISTS idx_pet_parasite_preferences_pet ON public.pet_parasite_preferences(pet_id);
CREATE INDEX IF NOT EXISTS idx_parasite_records_pet_date ON public.parasite_records(pet_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_parasite_records_plan ON public.parasite_records(plan_id);

-- ==========================================
-- 6. Açık Tablo Yetkileri (GRANT/REVOKE)
-- ==========================================
REVOKE ALL ON TABLE 
  public.parasite_protocols, 
  public.pet_parasite_preferences, 
  public.parasite_records 
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.parasite_protocols TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pet_parasite_preferences, public.parasite_records TO authenticated;

GRANT ALL ON TABLE 
  public.parasite_protocols, 
  public.pet_parasite_preferences, 
  public.parasite_records 
TO service_role;

-- ==========================================
-- 7. Row Level Security (RLS)
-- ==========================================

-- parasite_protocols RLS
ALTER TABLE public.parasite_protocols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parasite_protocols_read_all" ON public.parasite_protocols;
CREATE POLICY "parasite_protocols_read_all"
  ON public.parasite_protocols FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "parasite_protocols_admin_write" ON public.parasite_protocols;
CREATE POLICY "parasite_protocols_admin_write"
  ON public.parasite_protocols FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'founder')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'founder')
    )
  );

-- pet_parasite_preferences RLS
ALTER TABLE public.pet_parasite_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_parasite_preferences_owner_all" ON public.pet_parasite_preferences;
CREATE POLICY "pet_parasite_preferences_owner_all"
  ON public.pet_parasite_preferences FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners po
      WHERE po.pet_id = pet_parasite_preferences.pet_id
        AND po.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_owners po
      WHERE po.pet_id = pet_parasite_preferences.pet_id
        AND po.profile_id = auth.uid()
    )
  );

-- parasite_records RLS (Ayrıştırılmış Politikalar)
ALTER TABLE public.parasite_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parasite_records_owner_select" ON public.parasite_records;
CREATE POLICY "parasite_records_owner_select"
  ON public.parasite_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners po
      WHERE po.pet_id = parasite_records.pet_id
        AND po.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "parasite_records_owner_insert" ON public.parasite_records;
CREATE POLICY "parasite_records_owner_insert"
  ON public.parasite_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_owners po
      WHERE po.pet_id = pet_id
        AND po.profile_id = auth.uid()
    )
    AND parasite_protocol_id IS NOT NULL
    AND source IN ('user_manual', 'plan_completion')
    AND created_by = auth.uid()
    AND (
      document_storage_path IS NULL
      OR document_storage_path ~ ('^' || auth.uid()::text || '/' || pet_id::text || '/.+$')
    )
  );

DROP POLICY IF EXISTS "parasite_records_owner_update" ON public.parasite_records;
CREATE POLICY "parasite_records_owner_update"
  ON public.parasite_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners po
      WHERE po.pet_id = parasite_records.pet_id
        AND po.profile_id = auth.uid()
    )
    AND source IN ('user_manual', 'plan_completion')
    AND created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_owners po
      WHERE po.pet_id = pet_id
        AND po.profile_id = auth.uid()
    )
    AND parasite_protocol_id IS NOT NULL
    AND source IN ('user_manual', 'plan_completion')
    AND created_by = auth.uid()
    AND (
      document_storage_path IS NULL
      OR document_storage_path ~ ('^' || auth.uid()::text || '/' || pet_id::text || '/.+$')
    )
  );

DROP POLICY IF EXISTS "parasite_records_owner_delete" ON public.parasite_records;
CREATE POLICY "parasite_records_owner_delete"
  ON public.parasite_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners po
      WHERE po.pet_id = parasite_records.pet_id
        AND po.profile_id = auth.uid()
    )
    AND source IN ('user_manual', 'plan_completion')
    AND created_by = auth.uid()
  );

-- ==========================================
-- 8. Otomatik updated_at Trigger'ları
-- ==========================================

-- Trigger Fonksiyonları (Eğer yoksa oluştur)
CREATE OR REPLACE FUNCTION public.update_parasite_protocols_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_pet_parasite_preferences_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_parasite_records_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ language 'plpgsql';

-- Trigger Bağlamaları
DROP TRIGGER IF EXISTS trg_parasite_protocols_updated_at ON public.parasite_protocols;
CREATE TRIGGER trg_parasite_protocols_updated_at BEFORE UPDATE ON public.parasite_protocols FOR EACH ROW EXECUTE FUNCTION public.update_parasite_protocols_updated_at();

DROP TRIGGER IF EXISTS trg_pet_parasite_preferences_updated_at ON public.pet_parasite_preferences;
CREATE TRIGGER trg_pet_parasite_preferences_updated_at BEFORE UPDATE ON public.pet_parasite_preferences FOR EACH ROW EXECUTE FUNCTION public.update_pet_parasite_preferences_updated_at();

DROP TRIGGER IF EXISTS trg_parasite_records_updated_at ON public.parasite_records;
CREATE TRIGGER trg_parasite_records_updated_at BEFORE UPDATE ON public.parasite_records FOR EACH ROW EXECUTE FUNCTION public.update_parasite_records_updated_at();

-- Trigger yetki temizliği
REVOKE ALL ON FUNCTION public.update_parasite_protocols_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_pet_parasite_preferences_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_parasite_records_updated_at() FROM PUBLIC;

-- ==========================================
-- 9. Çapraz Tablo Doğrulama Trigger'ları
-- ==========================================

-- 9a. Tercih Doğrulama Trigger Fonksiyonu
CREATE OR REPLACE FUNCTION public.fn_validate_pet_parasite_preference()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pet_species TEXT;
    v_protocol_species TEXT;
    v_protocol_active BOOLEAN;
BEGIN
    -- Pet türünü çek
    SELECT species INTO v_pet_species
    FROM public.pets
    WHERE id = NEW.pet_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pet ID % bulunamadi.', NEW.pet_id;
    END IF;

    -- NULL/Geçersiz pet türü kontrolü
    IF v_pet_species IS NULL OR v_pet_species NOT IN ('cat', 'dog') THEN
        RAISE EXCEPTION 'Pet türü geçersiz veya boş: %', v_pet_species;
    END IF;

    -- Protokol türünü ve aktiflik durumunu çek
    SELECT species, is_active INTO v_protocol_species, v_protocol_active
    FROM public.parasite_protocols
    WHERE id = NEW.parasite_protocol_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Protokol ID % bulunamadi.', NEW.parasite_protocol_id;
    END IF;

    -- UPDATE durumunda kilitli alanların değiştirilmesini engelle
    IF TG_OP = 'UPDATE' AND auth.role() = 'authenticated' THEN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.pet_id IS DISTINCT FROM OLD.pet_id
           OR NEW.parasite_protocol_id IS DISTINCT FROM OLD.parasite_protocol_id
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Tercih kaydinin kimliği, pet, protokol ve oluşturulma tarihi değiştirilemez.';
        END IF;
    END IF;

    -- Protokolün aktif olup olmadığını kontrol et
    IF NOT v_protocol_active THEN
        -- Yeni preference INSERT'lerinde engelle
        IF TG_OP = 'INSERT' THEN
            RAISE EXCEPTION 'Pasif olan bir protokol (%) pet için tercih olarak eklenemez.', NEW.parasite_protocol_id;
        -- UPDATE durumunda enabled=true yapılmak istenirse engelle (enabled=false yapılabilir)
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.enabled = true THEN
                RAISE EXCEPTION 'Pasif olan bir protokol (%) aktif hale getirilemez.', NEW.parasite_protocol_id;
            END IF;
        END IF;
    END IF;

    -- Pet türü ile protokol türünü doğrula
    IF v_pet_species <> v_protocol_species THEN
        RAISE EXCEPTION 'Pet türü (%) ile protokol türü (%) uyuşmuyor.', v_pet_species, v_protocol_species;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_pet_parasite_preference ON public.pet_parasite_preferences;
CREATE TRIGGER trg_validate_pet_parasite_preference
  BEFORE INSERT OR UPDATE ON public.pet_parasite_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_pet_parasite_preference();

REVOKE ALL ON FUNCTION public.fn_validate_pet_parasite_preference() FROM PUBLIC;

-- 9b. Uygulama Kaydı Doğrulama Trigger Fonksiyonu (Fail-Closed)
CREATE OR REPLACE FUNCTION public.fn_validate_parasite_record()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pet_species TEXT;
    v_protocol_species TEXT;
    v_protocol_code TEXT;
    v_protocol_type TEXT;
    v_allowed_methods TEXT[];
    v_protocol_active BOOLEAN;
    v_plan_pet_id UUID;
    v_plan_category TEXT;
    v_plan_sub_type TEXT;
    v_plan_item_pet_id UUID;
    v_plan_item_plans_mirror_id UUID;
    v_plan_item_parasite_type TEXT;
BEGIN
    -- Pet türünü çek
    SELECT species INTO v_pet_species
    FROM public.pets
    WHERE id = NEW.pet_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pet ID % bulunamadi.', NEW.pet_id;
    END IF;

    -- NULL/Geçersiz Pet Türü Reddi
    IF v_pet_species IS NULL OR v_pet_species NOT IN ('cat', 'dog') THEN
        RAISE EXCEPTION 'Pet türü geçersiz veya boş: %', v_pet_species;
    END IF;

    -- UPDATE durumunda kilitli alanların değiştirilmesini engelle
    IF TG_OP = 'UPDATE' AND auth.role() = 'authenticated' THEN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.pet_id IS DISTINCT FROM OLD.pet_id
           OR NEW.source IS DISTINCT FROM OLD.source
           OR NEW.created_by IS DISTINCT FROM OLD.created_by
           OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
           OR NEW.source_plan_item_id IS DISTINCT FROM OLD.source_plan_item_id
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Kayit kimliği, kaynaği, oluşturulma tarihi, pet ve plan bağlantilari oluşturulduktan sonra değiştirilemez.';
        END IF;
    END IF;

    -- 1. Kaynak Anlami Kesinleştirme
    IF NEW.source = 'user_manual' THEN
        IF NEW.plan_id IS NOT NULL OR NEW.source_plan_item_id IS NOT NULL THEN
            RAISE EXCEPTION 'user_manual kaynakli kayitlarda plan_id ve source_plan_item_id alanlari boş (NULL) olmalidir.';
        END IF;
    ELSIF NEW.source = 'plan_completion' THEN
        IF NEW.plan_id IS NULL AND NEW.source_plan_item_id IS NULL THEN
            RAISE EXCEPTION 'plan_completion kaynakli kayitlarda plan_id veya source_plan_item_id alanlarindan en az biri dolu olmalidir.';
        END IF;
    END IF;

    -- 2. parasite_protocol_id Doğrulaması
    IF NEW.parasite_protocol_id IS NOT NULL THEN
        SELECT species, parasite_code, parasite_type, allowed_application_methods, is_active
        INTO v_protocol_species, v_protocol_code, v_protocol_type, v_allowed_methods, v_protocol_active
        FROM public.parasite_protocols
        WHERE id = NEW.parasite_protocol_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Protokol ID % bulunamadi.', NEW.parasite_protocol_id;
        END IF;

        IF v_pet_species <> v_protocol_species THEN
            RAISE EXCEPTION 'Pet türü (%) ile protokol türü (%) uyuşmuyor.', v_pet_species, v_protocol_species;
        END IF;

        IF NEW.parasite_code <> v_protocol_code THEN
            RAISE EXCEPTION 'parasite_code (%) bağlı protokolün kodu (%) ile uyuşmuyor.', NEW.parasite_code, v_protocol_code;
        END IF;

        IF NEW.parasite_type <> v_protocol_type THEN
            RAISE EXCEPTION 'parasite_type (%) bağlı protokolün tipi (%) ile uyuşmuyor.', NEW.parasite_type, v_protocol_type;
        END IF;

        IF NEW.source IN ('user_manual', 'plan_completion') THEN
            IF NOT (NEW.application_method = ANY(v_allowed_methods)) THEN
                RAISE EXCEPTION 'Uygulama yöntemi (%) protokolün izin verilen yöntemlerinden biri olmalidir: %', 
                    NEW.application_method, v_allowed_methods;
            END IF;

            IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.parasite_protocol_id IS NULL OR OLD.parasite_protocol_id <> NEW.parasite_protocol_id))) 
               AND NOT v_protocol_active THEN
                RAISE EXCEPTION 'Seçilen parazit protokolü pasif durumdadir. Pasif protokol ile yeni kayit oluşturulamaz.';
            END IF;
        END IF;
    END IF;

    -- 3. plan_id Doğrulaması (Fail-Closed)
    IF NEW.plan_id IS NOT NULL THEN
        SELECT pet_id, category, sub_type INTO v_plan_pet_id, v_plan_category, v_plan_sub_type
        FROM public.plans
        WHERE id = NEW.plan_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Plan ID % bulunamadi.', NEW.plan_id;
        END IF;

        IF v_plan_pet_id <> NEW.pet_id THEN
            RAISE EXCEPTION 'Plan pet_id (%) ile kayit pet_id (%) uyuşmuyor.', v_plan_pet_id, NEW.pet_id;
        END IF;

        IF v_plan_category <> 'parazit' THEN
            RAISE EXCEPTION 'Plan kategorisi parazit olmalidir. Bulunan: %', v_plan_category;
        END IF;

        -- sub_type ve parasite_type uyum doğrulamasi (Fail-Closed)
        CASE v_plan_sub_type
            WHEN 'İç Parazit' THEN
                IF NEW.parasite_type <> 'internal' THEN
                    RAISE EXCEPTION 'Plan alt tipi "İç Parazit" iken kayit parazit tipi "%" olamaz ("internal" olmali).', NEW.parasite_type;
                END IF;
            WHEN 'Dış Parazit' THEN
                IF NEW.parasite_type <> 'external' THEN
                    RAISE EXCEPTION 'Plan alt tipi "Dış Parazit" iken kayit parazit tipi "%" olamaz ("external" olmali).', NEW.parasite_type;
                END IF;
            WHEN 'Parazit Tasması' THEN
                IF NEW.parasite_type <> 'collar' THEN
                    RAISE EXCEPTION 'Plan alt tipi "Parazit Tasması" iken kayit parazit tipi "%" olamaz ("collar" olmali).', NEW.parasite_type;
                END IF;
            WHEN 'Birleşik Parazit', 'Kombine Parazit' THEN
                IF NEW.parasite_type <> 'combined' THEN
                    RAISE EXCEPTION 'Plan alt tipi "%" iken kayit parazit tipi "%" olamaz ("combined" olmali).', v_plan_sub_type, NEW.parasite_type;
                END IF;
            ELSE
                RAISE EXCEPTION 'Plan alt tipi "%" parazit kaydi için taninmiyor.', v_plan_sub_type;
        END CASE;
    END IF;

    -- 4. source_plan_item_id ve Çapraz Plan Uyum Denetimleri
    IF NEW.source_plan_item_id IS NOT NULL THEN
        SELECT pet_id, plans_mirror_id, parasite_type INTO v_plan_item_pet_id, v_plan_item_plans_mirror_id, v_plan_item_parasite_type
        FROM public.parasite_plan_items
        WHERE id = NEW.source_plan_item_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Plan öğesi ID % bulunamadi.', NEW.source_plan_item_id;
        END IF;

        IF v_plan_item_pet_id <> NEW.pet_id THEN
            RAISE EXCEPTION 'Plan öğesi pet_id (%) ile kayit pet_id (%) uyuşmuyor.', v_plan_item_pet_id, NEW.pet_id;
        END IF;

        IF v_plan_item_parasite_type <> NEW.parasite_type THEN
            RAISE EXCEPTION 'Plan öğesi parazit tipi (%) ile kayit parazit tipi (%) uyuşmuyor.', 
                v_plan_item_parasite_type, NEW.parasite_type;
        END IF;

        -- 5. İki bağlantı da varsa çelişki kontrolü (plans_mirror_id check)
        IF NEW.plan_id IS NOT NULL THEN
            IF v_plan_item_plans_mirror_id IS NULL THEN
                RAISE EXCEPTION 'Uyumsuz plan bağlantisi: Plan öğesinin plans_mirror_id alani boş (NULL) olamaz.';
            ELSIF v_plan_item_plans_mirror_id <> NEW.plan_id THEN
                RAISE EXCEPTION 'Plan öğesinin bağli olduğu plans_mirror_id (%) ile verilen plan_id (%) çelişiyor.', v_plan_item_plans_mirror_id, NEW.plan_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_parasite_record ON public.parasite_records;
CREATE TRIGGER trg_validate_parasite_record
  BEFORE INSERT OR UPDATE ON public.parasite_records
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_parasite_record();

REVOKE ALL ON FUNCTION public.fn_validate_parasite_record() FROM PUBLIC;

COMMIT;
