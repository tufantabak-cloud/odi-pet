-- Ensure columns exist before granting UPDATE permissions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact2_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact2_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact2_relation TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Grant UPDATE permissions on all user-editable profile columns to authenticated role
GRANT UPDATE (
  first_name,
  last_name,
  email,
  phone,
  avatar_color,
  city,
  district,
  neighborhood,
  bio,
  emergency_contact_name,
  emergency_contact_phone,
  emergency_contact_relation,
  emergency_contact2_name,
  emergency_contact2_phone,
  emergency_contact2_relation,
  preferred_vet_name,
  preferred_vet_phone,
  notify_email,
  notify_sms,
  notify_push,
  updated_at
) ON TABLE public.profiles TO authenticated;

