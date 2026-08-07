-- =============================================================================
-- Phase 18D: Plan Management Schema Extension
-- Migration : 20260807120000_plan_management_schema.sql
-- =============================================================================

BEGIN;

-- Extend subscription_plans with Phase 18D administration & provider mapping columns
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '⭐',
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'purple',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grace_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_plan_code TEXT,
  ADD COLUMN IF NOT EXISTS google_play_product_id TEXT,
  ADD COLUMN IF NOT EXISTS apple_product_id TEXT,
  ADD COLUMN IF NOT EXISTS upgrade_allowed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS downgrade_allowed BOOLEAN DEFAULT true;

-- Update existing records if display_name or status is null
UPDATE public.subscription_plans
SET
  display_name = COALESCE(display_name, plan_name),
  status = COALESCE(status, 'active'),
  billing_cycle = COALESCE(billing_cycle, 'monthly'),
  visibility = COALESCE(visibility, 'public'),
  trial_days = COALESCE(trial_days, 0),
  grace_days = COALESCE(grace_days, 7)
WHERE display_name IS NULL OR status IS NULL;

-- Enable RLS and permissions
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public plans read" ON public.subscription_plans;
CREATE POLICY "Public plans read" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write plans" ON public.subscription_plans;
CREATE POLICY "Admin write plans" ON public.subscription_plans 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'founder')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO service_role;

COMMIT;
