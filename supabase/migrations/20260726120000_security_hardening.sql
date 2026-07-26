BEGIN;

-- Profiles are user-readable, but security- and billing-related columns must
-- only be changed through trusted server-side code.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_manage_own_profile_strict" ON public.profiles;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name, phone, updated_at)
  ON TABLE public.profiles TO authenticated;

-- This legacy helper accepted an arbitrary profile and amount. Only trusted
-- service code may invoke it.
REVOKE ALL
  ON FUNCTION public.increment_care_points(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.increment_care_points(uuid, integer)
  TO service_role;

-- Central ownership helper used by sharing policies. SECURITY DEFINER avoids
-- policy recursion while the explicit search_path prevents object shadowing.
CREATE OR REPLACE FUNCTION public.user_owns_pet(
  p_pet_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pets AS p
    WHERE p.id = p_pet_id
      AND p.owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.pet_owners AS po
    WHERE po.pet_id = p_pet_id
      AND po.profile_id = p_user_id
      AND po.role = 'owner'
  );
$$;

REVOKE ALL
  ON FUNCTION public.user_owns_pet(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE
  ON FUNCTION public.user_owns_pet(uuid, uuid)
  TO authenticated, service_role;

-- Clinic-level administration is separate from the global application role.
ALTER TABLE public.clinic_memberships
  ADD COLUMN IF NOT EXISTS is_clinic_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_clinic_admin_of(
  p_clinic_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_memberships AS cm
    WHERE cm.clinic_id = p_clinic_id
      AND cm.profile_id = p_user_id
      AND cm.is_clinic_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.clinic_admin_can_view_profile(
  p_profile_id uuid,
  p_admin_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_memberships AS admin_membership
    JOIN public.clinic_memberships AS target_membership
      ON target_membership.clinic_id = admin_membership.clinic_id
    WHERE admin_membership.profile_id = p_admin_id
      AND admin_membership.is_clinic_admin = true
      AND target_membership.profile_id = p_profile_id
  );
$$;

REVOKE ALL
  ON FUNCTION public.is_clinic_admin_of(uuid, uuid)
  FROM PUBLIC, anon;
REVOKE ALL
  ON FUNCTION public.clinic_admin_can_view_profile(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE
  ON FUNCTION public.is_clinic_admin_of(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE
  ON FUNCTION public.clinic_admin_can_view_profile(uuid, uuid)
  TO authenticated, service_role;

DROP POLICY IF EXISTS "clinic_admins_view_clinic_members"
  ON public.clinic_memberships;
CREATE POLICY "clinic_admins_view_clinic_members"
  ON public.clinic_memberships
  FOR SELECT
  TO authenticated
  USING (public.is_clinic_admin_of(clinic_id));

DROP POLICY IF EXISTS "clinic_admins_view_member_profiles"
  ON public.profiles;
CREATE POLICY "clinic_admins_view_member_profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.clinic_admin_can_view_profile(id));

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.clinic_memberships
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.clinic_memberships TO authenticated;

-- Shared cards can only point at a pet owned by the claimed owner. Browser
-- clients read their own rows; all mutations flow through authorized routes.
ALTER TABLE public.shared_pet_cards
  DROP CONSTRAINT IF EXISTS shared_pet_cards_access_type_check;
ALTER TABLE public.shared_pet_cards
  ADD CONSTRAINT shared_pet_cards_access_type_check
  CHECK (access_type IN ('temporary', 'permanent', 'adoption'))
  NOT VALID;

ALTER TABLE public.shared_pet_cards
  DROP CONSTRAINT IF EXISTS shared_pet_cards_token_format_check;
ALTER TABLE public.shared_pet_cards
  ADD CONSTRAINT shared_pet_cards_token_format_check
  CHECK (
    char_length(share_token) BETWEEN 24 AND 128
    AND share_token ~ '^[A-Za-z0-9_-]+$'
  )
  NOT VALID;

DROP POLICY IF EXISTS "Owners can CRUD their own shared pet cards"
  ON public.shared_pet_cards;

DROP POLICY IF EXISTS "owners_select_shared_pet_cards"
  ON public.shared_pet_cards;
CREATE POLICY "owners_select_shared_pet_cards"
  ON public.shared_pet_cards
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    AND public.user_owns_pet(pet_id)
  );

DROP POLICY IF EXISTS "owners_insert_shared_pet_cards"
  ON public.shared_pet_cards;
CREATE POLICY "owners_insert_shared_pet_cards"
  ON public.shared_pet_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    AND public.user_owns_pet(pet_id)
  );

DROP POLICY IF EXISTS "owners_update_shared_pet_cards"
  ON public.shared_pet_cards;
CREATE POLICY "owners_update_shared_pet_cards"
  ON public.shared_pet_cards
  FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    AND public.user_owns_pet(pet_id)
  )
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    AND public.user_owns_pet(pet_id)
  );

DROP POLICY IF EXISTS "owners_delete_shared_pet_cards"
  ON public.shared_pet_cards;
CREATE POLICY "owners_delete_shared_pet_cards"
  ON public.shared_pet_cards
  FOR DELETE
  TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    AND public.user_owns_pet(pet_id)
  );

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.shared_pet_cards
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.shared_pet_cards TO authenticated;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.caregiver_logbook_entries
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.caregiver_logbook_entries TO authenticated;

COMMIT;
