-- Migration: Update plans table SELECT RLS policy to include active pet_memberships
-- Ticket: Task 5 - H3 Fix (Approved by Tufan)
-- Prerequisite: 20260728120000_canonical_pet_memberships_phase0.sql MUST be applied first.
-- Security Note: Uses pet_memberships (with status = 'active') to ensure revoked members do NOT retain access.

BEGIN;

-- 1) Create new policy first (transaction rolls back safely if table/column does not exist)
CREATE POLICY "users_view_plans_with_memberships"
  ON public.plans FOR SELECT
  USING (
    auth.uid() = user_id
    OR pet_id IN (
      SELECT pet_id FROM public.pet_memberships
      WHERE profile_id = (SELECT auth.uid())
        AND status = 'active'
    )
  );

-- 2) Drop old SELECT policies only after new policy creation succeeds
DROP POLICY IF EXISTS "Users can view their own plans" ON public.plans;
DROP POLICY IF EXISTS "kullanici_kendi_planlarini_gorur" ON public.plans;

COMMIT;
