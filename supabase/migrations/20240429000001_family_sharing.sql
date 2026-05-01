-- =============================================
-- FAMILY SHARING SYSTEM
-- Roles: owner > admin > editor > viewer
-- =============================================

-- Enable pgcrypto for token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. pet_members: Multi-user access to pets
CREATE TABLE IF NOT EXISTS public.pet_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','admin','editor','viewer')),
  invited_by UUID REFERENCES public.profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pet_id, profile_id)
);

-- 2. pet_invites: Pending invitations
CREATE TABLE IF NOT EXISTS public.pet_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor','viewer')),
  token TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pet_id, email)
);

-- 3. pet_activity_log: Shared activity feed
CREATE TABLE IF NOT EXISTS public.pet_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,        -- 'completed_vaccine', 'postponed_task', 'added_member', etc.
  entity_type TEXT,            -- 'health_schedule', 'vaccine_record', 'pet_member'
  entity_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────

ALTER TABLE public.pet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: check if caller has access to the pet (owner OR member)
CREATE OR REPLACE FUNCTION public.user_is_pet_member(p_pet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pets WHERE id = p_pet_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.pet_members WHERE pet_id = p_pet_id AND profile_id = auth.uid()
  );
$$;

-- Helper: get caller's role for a pet
CREATE OR REPLACE FUNCTION public.user_pet_role(p_pet_id UUID)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.pets WHERE id = p_pet_id AND owner_id = auth.uid()) THEN 'owner'
    ELSE (SELECT role FROM public.pet_members WHERE pet_id = p_pet_id AND profile_id = auth.uid())
  END;
$$;

-- pet_members policies
DROP POLICY IF EXISTS "Members can view fellow members" ON public.pet_members;
CREATE POLICY "Members can view fellow members" ON public.pet_members
  FOR SELECT USING (public.user_is_pet_member(pet_id));

DROP POLICY IF EXISTS "Owner/admin can manage members" ON public.pet_members;
CREATE POLICY "Owner/admin can manage members" ON public.pet_members
  FOR ALL USING (
    public.user_pet_role(pet_id) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "Allow self-insert on accept" ON public.pet_members;
CREATE POLICY "Allow self-insert on accept" ON public.pet_members
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- pet_invites policies
DROP POLICY IF EXISTS "Members can view invites" ON public.pet_invites;
CREATE POLICY "Members can view invites" ON public.pet_invites
  FOR SELECT USING (public.user_is_pet_member(pet_id) OR invited_by = auth.uid());

DROP POLICY IF EXISTS "Owner/admin can manage invites" ON public.pet_invites;
CREATE POLICY "Owner/admin can manage invites" ON public.pet_invites
  FOR ALL USING (
    public.user_pet_role(pet_id) IN ('owner', 'admin')
    OR invited_by = auth.uid()
  );

-- activity log policies
DROP POLICY IF EXISTS "Members can view activity" ON public.pet_activity_log;
CREATE POLICY "Members can view activity" ON public.pet_activity_log
  FOR SELECT USING (public.user_is_pet_member(pet_id));

DROP POLICY IF EXISTS "Members can insert activity" ON public.pet_activity_log;
CREATE POLICY "Members can insert activity" ON public.pet_activity_log
  FOR INSERT WITH CHECK (public.user_is_pet_member(pet_id) AND actor_id = auth.uid());

-- ── Auto-populate owner into pet_members on pet creation ──
CREATE OR REPLACE FUNCTION public.on_pet_created_add_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.pet_members (pet_id, profile_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_pet_created_add_owner ON public.pets;
CREATE TRIGGER on_pet_created_add_owner
  AFTER INSERT ON public.pets
  FOR EACH ROW EXECUTE PROCEDURE public.on_pet_created_add_owner();
