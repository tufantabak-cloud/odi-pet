-- ==============================================================================
-- CLEANUP SCRIPT: Remove unused MVP and legacy tables
-- Purpose: Remove tables that are no longer used by the frontend to improve performance.
-- Safety: Uses CASCADE to ensure any dependent views/constraints are also dropped.
-- ==============================================================================

-- 1. Drop old health module tables (replaced by vaccines and health_schedules)
DROP TABLE IF EXISTS public.health_vaccines CASCADE;
DROP TABLE IF EXISTS public.health_reproduction CASCADE;
DROP TABLE IF EXISTS public.health_growth CASCADE;

-- 2. Drop unused marketplace/nutrition tables
DROP TABLE IF EXISTS public.nutrition_plans CASCADE;
DROP TABLE IF EXISTS public.pet_food_inventory CASCADE;
DROP TABLE IF EXISTS public.refill_subscriptions CASCADE;
DROP TABLE IF EXISTS public.refill_orders CASCADE;

-- 3. Drop unused logging and document tables
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.system_logs CASCADE;

-- 4. Drop unused RPC functions that were identified during audit
DROP FUNCTION IF EXISTS public.auto_generate_vaccine_schedules() CASCADE;
DROP FUNCTION IF EXISTS public.adjust_care_score(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_subscription() CASCADE;

-- Ensure that core tables have required indices (Performance Optimization)
-- Create index on pet_id for vaccine_records if not exists
CREATE INDEX IF NOT EXISTS idx_vaccine_records_pet_id ON public.vaccine_records(pet_id);

-- Create index on pet_id for health_schedules if not exists
CREATE INDEX IF NOT EXISTS idx_health_schedules_pet_id ON public.health_schedules(pet_id);

-- Create index on owner_id for pets if not exists
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON public.pets(owner_id);
