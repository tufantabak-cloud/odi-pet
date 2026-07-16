-- Mükerrer Kayıt Kontrolü Önkoşuldur. Eğer migration çalışırken duplicate bulunursa hata fırlatıp duracaktır.
DO $$
DECLARE
    v_dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_dup_count FROM (
        SELECT plan_id
        FROM public.parasite_records
        WHERE plan_id IS NOT NULL
          AND source = 'plan_completion'
        GROUP BY plan_id
        HAVING COUNT(*) > 1
    ) t;

    IF v_dup_count > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Duplicate plan completion records found in parasite_records. Migration aborted!';
    END IF;
END;
$$;

-- unique_parasite_records_plan_id index semantik kontrolü ve tanımı
DO $$
DECLARE
    v_index_exists BOOLEAN;
    v_is_unique BOOLEAN;
    v_is_valid BOOLEAN;
    v_definition TEXT;
BEGIN
    SELECT 
        idx.indisunique,
        idx.indisvalid,
        pg_get_indexdef(idx.indexrelid)
    INTO v_is_unique, v_is_valid, v_definition
    FROM pg_index idx
    JOIN pg_class c ON c.oid = idx.indrelid
    JOIN pg_class i ON i.oid = idx.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'parasite_records'
      AND i.relname = 'unique_parasite_records_plan_id';

    IF FOUND THEN
        -- Eğer index mevcutsa, semantik doğruluğunu ve valid olduğunu kontrol et
        IF NOT v_is_unique OR NOT v_is_valid OR v_definition NOT LIKE '%plan_id%' OR v_definition NOT LIKE '%source = ''plan_completion''%' THEN
            RAISE EXCEPTION 'CRITICAL: An invalid or incorrectly defined index unique_parasite_records_plan_id already exists!';
        END IF;
    ELSE
        -- Başka bir isimle aynı semantik benzersizliği sağlayan index var mı kontrol et
        SELECT EXISTS (
            SELECT 1 
            FROM pg_index idx
            JOIN pg_class c ON c.oid = idx.indrelid
            JOIN pg_class i ON i.oid = idx.indexrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' 
              AND c.relname = 'parasite_records'
              AND idx.indisunique = true
              AND idx.indisvalid = true
              AND pg_get_indexdef(idx.indexrelid) LIKE '%plan_id%'
              AND pg_get_indexdef(idx.indexrelid) LIKE '%source = ''plan_completion''%'
        ) INTO v_index_exists;

        IF NOT v_index_exists THEN
            CREATE UNIQUE INDEX unique_parasite_records_plan_id 
            ON public.parasite_records (plan_id) 
            WHERE (plan_id IS NOT NULL AND source = 'plan_completion');
        END IF;
    END IF;
END;
$$;

-- complete_parasite_plan RPC fonksiyon güncellemesi (FOR UPDATE, RBAC & Oturum Sahiplik Doğrulaması)
CREATE OR REPLACE FUNCTION public.complete_parasite_plan(
    p_plan_id UUID,
    p_administered_at DATE,
    p_application_method TEXT,
    p_brand_free_text TEXT,
    p_product_free_text TEXT,
    p_protection_duration_days INTEGER,
    p_notes TEXT,
    p_document_storage_path TEXT,
    p_created_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_plan RECORD;
    v_protocol RECORD;
    v_record_id UUID;
    v_pet RECORD;
    v_proto_id UUID;
    v_existing_row RECORD;
BEGIN
    -- 1. Check if plan is already completed/has a parasite record (idempotency check)
    SELECT id, parasite_code, parasite_type, protection_duration_days, brand_free_text, product_free_text, notes, document_storage_path
    INTO v_existing_row
    FROM public.parasite_records
    WHERE plan_id = p_plan_id AND source = 'plan_completion'
    LIMIT 1;

    IF v_existing_row.id IS NOT NULL THEN
        -- Plan is already completed, return existing record info
        RETURN jsonb_build_object(
            'success', true,
            'idempotent', true,
            'record_id', v_existing_row.id
        );
    END IF;

    -- 2. Fetch the plan with FOR UPDATE locking
    SELECT * INTO v_plan FROM public.plans WHERE id = p_plan_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PLAN_NOT_FOUND';
    END IF;

    -- 3. Verify pet ownership inside the RPC
    PERFORM 1 FROM public.pet_owners WHERE pet_id = v_plan.pet_id AND profile_id = p_created_by;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    -- 4. Verify plan state and category
    IF v_plan.category <> 'parazit' THEN
        RAISE EXCEPTION 'NOT_PARASITE_PLAN';
    END IF;

    IF v_plan.status = 'cancelled' THEN
        RAISE EXCEPTION 'PLAN_CANCELLED';
    END IF;

    IF v_plan.status = 'completed' THEN
        -- Tutarsız plan durumu kontrolü (completed ama parasite_records kaydı yok)
        RAISE EXCEPTION 'INCONSISTENT_PLAN_STATE';
    END IF;

    -- 5. Resolve protocol from plan's extra_data
    BEGIN
        v_proto_id := (v_plan.extra_data->'product'->>'id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_proto_id := NULL;
    END;

    IF v_proto_id IS NULL THEN
        BEGIN
            v_proto_id := (v_plan.extra_data->>'parasite_protocol_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_proto_id := NULL;
        END;
    END IF;

    IF v_proto_id IS NULL THEN
        RAISE EXCEPTION 'PROTOCOL_NOT_FOUND';
    END IF;

    SELECT * INTO v_protocol FROM public.parasite_protocols WHERE id = v_proto_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROTOCOL_NOT_FOUND';
    END IF;

    -- 6. Check pet species compatibility
    SELECT * INTO v_pet FROM public.pets WHERE id = v_plan.pet_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PET_NOT_FOUND';
    END IF;

    IF v_protocol.species <> 'both' AND v_protocol.species <> v_pet.species THEN
        RAISE EXCEPTION 'PROTOCOL_SPECIES_MISMATCH';
    END IF;

    -- 7. Check allowed application methods
    IF NOT (p_application_method = ANY(v_protocol.allowed_application_methods)) THEN
        RAISE EXCEPTION 'INVALID_APPLICATION_METHOD';
    END IF;

    -- 8. Insert into parasite_records
    INSERT INTO public.parasite_records (
        pet_id,
        parasite_protocol_id,
        parasite_code,
        parasite_type,
        administered_at,
        brand_free_text,
        product_free_text,
        application_method,
        protection_duration_days,
        notes,
        document_storage_path,
        plan_id,
        source,
        created_by
    ) VALUES (
        v_plan.pet_id,
        v_protocol.id,
        v_protocol.parasite_code,
        v_protocol.parasite_type,
        p_administered_at,
        p_brand_free_text,
        p_product_free_text,
        p_application_method,
        COALESCE(p_protection_duration_days, v_protocol.default_protection_duration_days),
        p_notes,
        p_document_storage_path,
        p_plan_id,
        'plan_completion',
        p_created_by
    ) RETURNING id INTO v_record_id;

    -- 9. Update plan status
    UPDATE public.plans
    SET status = 'completed', updated_at = now()
    WHERE id = p_plan_id;

    RETURN jsonb_build_object(
        'success', true,
        'idempotent', false,
        'record_id', v_record_id
    );
END;
$$;

-- Restrict RPC execute permission to service_role only (Alternatif Model)
REVOKE ALL ON FUNCTION public.complete_parasite_plan(UUID, DATE, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_parasite_plan(UUID, DATE, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID) TO service_role;

-- fn_validate_parasite_record trigger'ının güncellenmesi (Null-safe check ve pasif protokol plan completion istisnası)
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

            -- Null-safe ve kaynağa duyarlı pasif protokol doğrulaması
            IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.parasite_protocol_id IS DISTINCT FROM NEW.parasite_protocol_id))) 
               AND NOT v_protocol_active AND NEW.source = 'user_manual' THEN
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

-- Local testing SQL execution helpers (execute_ddl and execute_sql definitions)
CREATE OR REPLACE FUNCTION public.execute_ddl(ddl TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    EXECUTE ddl;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_sql(query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSON;
BEGIN
    EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO v_result;
    RETURN COALESCE(v_result, '[]'::json);
END;
$$;
