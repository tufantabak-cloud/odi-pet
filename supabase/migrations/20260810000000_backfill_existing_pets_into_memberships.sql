-- Mevcut tüm petleri pet_memberships tablosuna backfill et.
-- Bu migration, pets.owner_id üzerinden kayıtlı tüm sahibi olan petlerin
-- pet_memberships tablosunda 'primary_owner' kaydı olmasını garantiler.
-- ON CONFLICT ile idempotent — birden fazla çalıştırılabilir.

INSERT INTO public.pet_memberships (
  pet_id,
  profile_id,
  role,
  status,
  source,
  accepted_at,
  created_at,
  updated_at
)
SELECT
  p.id           AS pet_id,
  p.owner_id     AS profile_id,
  'primary_owner'::public.pet_membership_role AS role,
  'active'::public.pet_membership_status      AS status,
  'migration'::public.pet_membership_source   AS source,
  p.created_at   AS accepted_at,
  now()          AS created_at,
  now()          AS updated_at
FROM public.pets AS p
WHERE p.owner_id IS NOT NULL
ON CONFLICT (pet_id, profile_id) DO NOTHING;
