BEGIN;

-- ==========================================
-- complete_parasite_plan: planned_product bağlantısı (ADDITIVE)
-- ==========================================
-- Amaç: Plan sihirbazında katalogdan ürün seçildiğinde (extra_data.planned_product),
-- plan tamamlandığında oluşan parasite_records kaydı da:
--   1. parasite_product_id ile gerçek katalog ürününe bağlansın (manuel kayıtlarla
--      tutarlı provenans),
--   2. süre fallback zincirine ürünün gerçek süresi de girsin.
--
-- Fonksiyon imzası, izinleri ve diğer tüm doğrulama/kilit mantığı DEĞİŞMEZ.
-- extra_data.product.id (protokol UUID'si) semantiğine dokunulmaz.

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
    v_planned_product_id UUID;
    v_planned_duration INTEGER;
BEGIN
    -- 1. Idempotency check
    SELECT id, parasite_code, parasite_type, protection_duration_days, brand_free_text, product_free_text, notes, document_storage_path
    INTO v_existing_row
    FROM public.parasite_records
    WHERE plan_id = p_plan_id AND source = 'plan_completion'
    LIMIT 1;

    IF v_existing_row.id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'idempotent', true, 'record_id', v_existing_row.id);
    END IF;

    -- 2. Fetch plan with lock
    SELECT * INTO v_plan FROM public.plans WHERE id = p_plan_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PLAN_NOT_FOUND';
    END IF;

    -- 3. Ownership
    PERFORM 1 FROM public.pet_owners WHERE pet_id = v_plan.pet_id AND profile_id = p_created_by;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    -- 4. Plan state/category
    IF v_plan.category <> 'parazit' THEN
        RAISE EXCEPTION 'NOT_PARASITE_PLAN';
    END IF;
    IF v_plan.status = 'cancelled' THEN
        RAISE EXCEPTION 'PLAN_CANCELLED';
    END IF;
    IF v_plan.status = 'completed' THEN
        RAISE EXCEPTION 'INCONSISTENT_PLAN_STATE';
    END IF;

    -- 5. Resolve protocol from plan's extra_data (DEĞİŞMEDİ)
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

    -- 5b. (YENİ) Katalog ürünü ve süresini extra_data.planned_product'tan çöz.
    -- Ürün var olmalı (soft-deactivate edilenler dahil); yoksa NULL bırakılır
    -- (FK ihlali önlenir, tamamlama yine de başarılı olur).
    BEGIN
        v_planned_product_id := (v_plan.extra_data->'planned_product'->>'parasite_product_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_planned_product_id := NULL;
    END;
    IF v_planned_product_id IS NOT NULL THEN
        PERFORM 1 FROM public.parasite_products WHERE id = v_planned_product_id;
        IF NOT FOUND THEN
            v_planned_product_id := NULL;
        END IF;
    END IF;
    BEGIN
        v_planned_duration := (v_plan.extra_data->'planned_product'->>'protection_duration_days')::INTEGER;
        IF v_planned_duration IS NOT NULL AND v_planned_duration <= 0 THEN
            v_planned_duration := NULL; -- tedavi ürünü (0) → protokol varsayılanına düş
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_planned_duration := NULL;
    END;

    -- 6. Species compatibility
    SELECT * INTO v_pet FROM public.pets WHERE id = v_plan.pet_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PET_NOT_FOUND';
    END IF;
    IF v_protocol.species <> 'both' AND v_protocol.species <> v_pet.species THEN
        RAISE EXCEPTION 'PROTOCOL_SPECIES_MISMATCH';
    END IF;

    -- 7. Allowed methods
    IF NOT (p_application_method = ANY(v_protocol.allowed_application_methods)) THEN
        RAISE EXCEPTION 'INVALID_APPLICATION_METHOD';
    END IF;

    -- 8. Insert (parasite_product_id EKLENDİ; süre fallback'ine ürün süresi girdi)
    INSERT INTO public.parasite_records (
        pet_id,
        parasite_protocol_id,
        parasite_product_id,
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
        v_planned_product_id,
        v_protocol.parasite_code,
        v_protocol.parasite_type,
        p_administered_at,
        p_brand_free_text,
        p_product_free_text,
        p_application_method,
        COALESCE(p_protection_duration_days, v_planned_duration, v_protocol.default_protection_duration_days),
        p_notes,
        p_document_storage_path,
        p_plan_id,
        'plan_completion',
        p_created_by
    ) RETURNING id INTO v_record_id;

    -- 9. Update plan status
    UPDATE public.plans SET status = 'completed', updated_at = now() WHERE id = p_plan_id;

    RETURN jsonb_build_object('success', true, 'idempotent', false, 'record_id', v_record_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_parasite_plan(UUID, DATE, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_parasite_plan(UUID, DATE, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID) TO service_role;

COMMIT;
