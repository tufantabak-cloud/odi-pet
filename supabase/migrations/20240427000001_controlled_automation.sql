-- =============================================
-- CONTROLLED AUTOMATION MIGRATION
-- 1. Drops blind auto-generation and health score triggers
-- 2. Adds plan_id, postpone_count, and source to health_schedules
-- 3. Creates health_plans table
-- =============================================

-- 1. Drop auto-generation trigger blindly creating 1 year of schedules
DROP TRIGGER IF EXISTS on_pet_created_generate_schedules ON public.pets;
DROP FUNCTION IF EXISTS public.auto_generate_vaccine_schedules();

-- 2. Drop the trigger that auto-increases health score
DROP TRIGGER IF EXISTS trigger_on_vaccine_record_inserted ON public.vaccine_records;
DROP FUNCTION IF EXISTS public.on_vaccine_record_inserted();

-- 3. Create health_plans table to track recurring series (as per prompt)
CREATE TABLE IF NOT EXISTS public.health_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    frequency TEXT, -- 'once', 'monthly', 'yearly'
    dose_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage health plans" ON public.health_plans;
CREATE POLICY "Owners manage health plans" ON public.health_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = health_plans.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- 4. Add necessary columns to health_schedules table
ALTER TABLE public.health_schedules 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.health_plans(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS postpone_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS source TEXT; -- 'auto' or 'manual'
