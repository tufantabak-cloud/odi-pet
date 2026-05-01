-- Atomic care points increment (prevents race conditions)
CREATE OR REPLACE FUNCTION public.increment_care_points(p_profile_id UUID, p_amount INTEGER)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET care_points = COALESCE(care_points, 0) + p_amount
  WHERE id = p_profile_id;
$$;

-- Also fix the pets table: ensure owner's pet_members entry exists for existing pets
-- (for pets created before the trigger was added)
INSERT INTO public.pet_members (pet_id, profile_id, role)
SELECT id, owner_id, 'owner'
FROM public.pets
WHERE owner_id IS NOT NULL
ON CONFLICT (pet_id, profile_id) DO NOTHING;
