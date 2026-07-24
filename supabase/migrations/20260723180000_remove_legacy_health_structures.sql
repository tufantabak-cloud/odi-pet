-- Migration: 20260723180000_remove_legacy_health_structures.sql
-- Description: Safely drop legacy tables vaccine_setup_profiles & parasite_plan_items and associated legacy views.

BEGIN;

-- 1. Remove legacy foreign key constraint from parasite_records if exists
ALTER TABLE IF EXISTS public.parasite_records 
  DROP CONSTRAINT IF EXISTS parasite_records_source_plan_item_id_fkey;

-- 2. Remove legacy source_plan_item_id column from parasite_records if exists
ALTER TABLE IF EXISTS public.parasite_records 
  DROP COLUMN IF EXISTS source_plan_item_id;

-- 3. Drop legacy views dependent on legacy plan items
DROP VIEW IF EXISTS public.parasite_upcoming_tasks CASCADE;
DROP VIEW IF EXISTS public.vaccination_upcoming_tasks CASCADE;

-- 4. Drop legacy tables
DROP TABLE IF EXISTS public.parasite_plan_items;
DROP TABLE IF EXISTS public.vaccine_setup_profiles;

COMMIT;
