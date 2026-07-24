-- Migration: Add self-reference CHECK constraint to plans
-- Date: 2026-07-23

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_plans_parent_plan_id_not_self'
  ) THEN
    ALTER TABLE public.plans
    ADD CONSTRAINT check_plans_parent_plan_id_not_self
    CHECK (parent_plan_id IS NULL OR parent_plan_id <> id);
  END IF;
END $$;
