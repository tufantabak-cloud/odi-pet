-- ============================================================================
-- Migration: 20260724190000_end_pet_food_assignment.sql
-- Beslenme P0.2.1: Atomic Assignment Termination & Stock Action
-- ============================================================================

CREATE OR REPLACE FUNCTION public.end_pet_food_assignment(
  p_pet_id UUID,
  p_assignment_id UUID,
  p_stock_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_role TEXT;
  v_assignment_id UUID;
BEGIN
  -- 1. Security Check: Assert caller is an owner of the pet
  SELECT role INTO v_owner_role
  FROM public.pet_owners
  WHERE pet_id = p_pet_id AND profile_id = auth.uid();

  IF v_owner_role IS NULL THEN
    RAISE SQLSTATE '42501' USING MESSAGE = 'Bu petin beslenme planını sonlandırma yetkiniz bulunmuyor.';
  END IF;

  -- 2. Validate Stock Action Input Whitelist
  IF p_stock_action NOT IN ('keep', 'mark_depleted', 'remove') THEN
    RAISE EXCEPTION 'Geçersiz stok işlemi: %. Yalnızca keep, mark_depleted veya remove seçilebilir.', p_stock_action;
  END IF;

  -- 3. Lock the Target Assignment
  SELECT id INTO v_assignment_id
  FROM public.pet_food_assignments
  WHERE id = p_assignment_id
    AND pet_id = p_pet_id
    AND ended_at IS NULL
  FOR UPDATE;

  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Sonlandırılacak aktif mama kaydı bulunamadı (ID: %).', p_assignment_id;
  END IF;

  -- 4. Lock the Inventory (if it exists)
  PERFORM 1 FROM public.food_inventory WHERE pet_id = p_pet_id FOR UPDATE;

  -- 5. Terminate the Target Assignment (Set ended_at = CURRENT_DATE, KEEP is_primary untouched)
  UPDATE public.pet_food_assignments
  SET ended_at = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = v_assignment_id;

  -- 6. Apply Stock Decision
  IF p_stock_action = 'remove' THEN
    DELETE FROM public.food_inventory WHERE pet_id = p_pet_id;
  ELSIF p_stock_action = 'mark_depleted' THEN
    UPDATE public.food_inventory
    SET current_stock_grams = 0,
        last_refill_date = NOW()
    WHERE pet_id = p_pet_id;
  -- IF p_stock_action = 'keep', do nothing to food_inventory.
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ended_assignment_id', v_assignment_id,
    'stock_action', p_stock_action
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.end_pet_food_assignment(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.end_pet_food_assignment(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.end_pet_food_assignment(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_pet_food_assignment(UUID, UUID, TEXT) TO service_role;
