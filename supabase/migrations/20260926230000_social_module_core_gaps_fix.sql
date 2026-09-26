-- Social Module Core Gaps Fix Migration
-- Adds missing columns to lost_reports, pet_adoptions, and breeding_listings

-- 1. In lost_reports:
ALTER TABLE public.lost_reports
  ADD COLUMN IF NOT EXISTS additional_photos text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS distinctive_features text,
  ADD COLUMN IF NOT EXISTS collar_info text,
  ADD COLUMN IF NOT EXISTS color text;

-- 2. In pet_adoptions:
ALTER TABLE public.pet_adoptions
  ADD COLUMN IF NOT EXISTS additional_photos text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS special_needs text;

-- 3. In breeding_listings:
ALTER TABLE public.breeding_listings
  ADD COLUMN IF NOT EXISTS additional_photos text[] DEFAULT '{}'::text[];
