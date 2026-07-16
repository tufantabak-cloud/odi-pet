-- 1. Create UNIQUE index to guarantee single record per plan_id completed via plan_completion
CREATE UNIQUE INDEX IF NOT EXISTS UNIQUE_parasite_records_plan_id 
ON public.parasite_records (plan_id) 
WHERE (plan_id IS NOT NULL AND source = 'plan_completion');

-- 2. Create the complete_parasite_plan database function
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

    -- 2. Fetch the plan
    SELECT * INTO v_plan FROM public.plans WHERE id = p_plan_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PLAN_NOT_FOUND';
    END IF;

    IF v_plan.category <> 'parazit' THEN
        RAISE EXCEPTION 'NOT_PARASITE_PLAN';
    END IF;

    IF v_plan.status = 'cancelled' THEN
        RAISE EXCEPTION 'PLAN_CANCELLED';
    END IF;

    -- 3. Resolve and verify parasite protocol from plan's extra_data
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

    -- 4. Check pet species compatibility
    SELECT * INTO v_pet FROM public.pets WHERE id = v_plan.pet_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PET_NOT_FOUND';
    END IF;

    IF v_protocol.species <> 'both' AND v_protocol.species <> v_pet.species THEN
        RAISE EXCEPTION 'PROTOCOL_SPECIES_MISMATCH';
    END IF;

    -- 5. Check allowed application methods
    IF NOT (p_application_method = ANY(v_protocol.allowed_application_methods)) THEN
        RAISE EXCEPTION 'INVALID_APPLICATION_METHOD';
    END IF;

    -- 6. Insert into parasite_records
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

    -- 7. Update plan status
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_parasite_plan(
    UUID, DATE, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID
) TO authenticated, service_role;
