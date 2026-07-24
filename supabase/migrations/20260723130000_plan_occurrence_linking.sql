-- Migration: Plan occurrence linking and vaccine record association
-- Date: 2026-07-23

-- 1. Add parent_plan_id to plans table
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS parent_plan_id UUID NULL REFERENCES public.plans(id) ON DELETE SET NULL;

-- 2. Add plan_id to vaccine_records_v2 table
ALTER TABLE public.vaccine_records_v2
ADD COLUMN IF NOT EXISTS plan_id UUID NULL REFERENCES public.plans(id) ON DELETE SET NULL;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plans_parent_plan_id ON public.plans(parent_plan_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_records_v2_plan_id ON public.vaccine_records_v2(plan_id);
