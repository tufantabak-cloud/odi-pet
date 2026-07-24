-- ============================================================================
-- Migration: 20260724180000_nutrition_assignment_swap.sql
-- Beslenme Faz 1A.2.1 P0.2: Atomic Nutrition Assignment Swap
-- ============================================================================

CREATE OR REPLACE FUNCTION public.swap_pet_food_assignment(
  p_pet_id UUID,
  p_old_assignment_id UUID,
  p_new_assignment JSONB,
  p_new_stock JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_role TEXT;
  v_old_assignment_id UUID;
  v_new_assignment_id UUID;
  v_stock_action TEXT;
  v_stock_grams NUMERIC;
BEGIN
  -- 1. Security Check: Assert the caller is an owner of the pet
  SELECT role INTO v_owner_role
  FROM public.pet_owners
  WHERE pet_id = p_pet_id AND profile_id = auth.uid();

  IF v_owner_role IS NULL THEN
    RAISE SQLSTATE '42501' USING MESSAGE = 'Bu petin beslenme planını değiştirme yetkiniz bulunmuyor.';
  END IF;

  -- 2. Lock the Old Assignment
  SELECT id INTO v_old_assignment_id
  FROM public.pet_food_assignments
  WHERE id = p_old_assignment_id
    AND pet_id = p_pet_id
    AND is_primary = true
    AND ended_at IS NULL
  FOR UPDATE;

  IF v_old_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Eski mama planı bulunamadı veya artık aktif değil (ID: %).', p_old_assignment_id;
  END IF;

  -- 3. Lock the Inventory (if it exists)
  PERFORM 1 FROM public.food_inventory WHERE pet_id = p_pet_id FOR UPDATE;

  -- 4. Terminate the Old Assignment
  UPDATE public.pet_food_assignments
  SET ended_at = CURRENT_DATE
  WHERE id = v_old_assignment_id;

  -- 5. Insert the New Assignment
  -- We deliberately ignore pet_id, ended_at, and is_primary from the JSON to prevent tampering.
  INSERT INTO public.pet_food_assignments (
    pet_id,
    food_product_family_id,
    food_sku_id,
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
    created_by
  )
  VALUES (
    p_pet_id,
    (p_new_assignment->>'food_product_family_id')::UUID,
    (p_new_assignment->>'food_sku_id')::UUID,
    p_new_assignment->>'brand_free_text',
    p_new_assignment->>'product_free_text',
    p_new_assignment->>'food_form',
    (p_new_assignment->>'daily_target_grams')::NUMERIC,
    (p_new_assignment->>'meals_per_day')::INT,
    COALESCE((p_new_assignment->>'started_at')::DATE, CURRENT_DATE),
    NULL,
    true, -- Must be primary
    COALESCE(p_new_assignment->>'measurement_method', 'owner_confirmed'),
    COALESCE(p_new_assignment->>'source', 'manual'),
    auth.uid()
  )
  RETURNING id INTO v_new_assignment_id;

  -- 6. Process the New Stock Decision
  -- Expected format for p_new_stock:
  -- null -> User chose "Vazgeç" (should not happen since UI would cancel the whole call)
  -- {"action": "delete"} -> Remove inventory entirely
  -- {"action": "set", "grams": 0} -> Keep inventory but set to 0
  -- {"action": "set", "grams": 1500} -> Update/Insert with exact amount

  IF p_new_stock IS NOT NULL THEN
    v_stock_action := p_new_stock->>'action';
    
    IF v_stock_action = 'delete' THEN
      DELETE FROM public.food_inventory WHERE pet_id = p_pet_id;
    ELSIF v_stock_action = 'set' THEN
      v_stock_grams := (p_new_stock->>'grams')::NUMERIC;
      IF v_stock_grams IS NULL THEN
        v_stock_grams := 0;
      END IF;
      
      -- Update if exists
      UPDATE public.food_inventory
      SET current_stock_grams = v_stock_grams,
          last_refill_date = NOW()
      WHERE pet_id = p_pet_id;

      -- Insert if not exists
      IF NOT FOUND THEN
        INSERT INTO public.food_inventory (
          pet_id,
          current_stock_grams,
          last_refill_date
        )
        VALUES (
          p_pet_id,
          v_stock_grams,
          NOW()
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_assignment_id', v_new_assignment_id,
    'ended_assignment_id', v_old_assignment_id
  );

EXCEPTION WHEN OTHERS THEN
  -- The transaction will automatically rollback due to the exception
  RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.swap_pet_food_assignment(UUID, UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.swap_pet_food_assignment(UUID, UUID, JSONB, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.swap_pet_food_assignment(UUID, UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.swap_pet_food_assignment(UUID, UUID, JSONB, JSONB) TO service_role;
