-- ============================================================
-- Migration: System Settings Table & Dynamic Welcome Credit Trigger
-- Date: 2026-08-07
-- Description: Creates system_settings table for dynamic admin configuration
-- and updates handle_new_profile_welcome_credit() to dynamically query welcome_credit_days.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- RLS Configuration
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public and authenticated read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin and founder manage system_settings" ON public.system_settings;

-- Public & Authenticated Read Access
CREATE POLICY "Public and authenticated read system_settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admin & Founder Write Access
CREATE POLICY "Admin and founder manage system_settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );

-- Service Role Full Access Grant
GRANT ALL ON TABLE public.system_settings TO service_role;
GRANT SELECT ON TABLE public.system_settings TO authenticated, anon;

-- Seed default membership_rules if not exists
INSERT INTO public.system_settings (key, value)
VALUES (
  'membership_rules',
  jsonb_build_object(
    'welcome_credit_days', 90,
    'per_pet_credit_days', 90,
    'referee_welcome_days', 30,
    'referral_tier_1_days', 30,
    'referral_tier_2_bonus', 30,
    'referral_tier_3_bonus', 60,
    'referral_tier_4_bonus', 120,
    'referral_tier_5_bonus', 300,
    'monthly_invite_cap', 10
  )
)
ON CONFLICT (key) DO NOTHING;

-- Update handle_new_profile_welcome_credit trigger function to read dynamic welcome_credit_days
CREATE OR REPLACE FUNCTION public.handle_new_profile_welcome_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_welcome_days INT := 90;
BEGIN
  BEGIN
    SELECT COALESCE((value->>'welcome_credit_days')::INT, 90)
    INTO v_welcome_days
    FROM public.system_settings
    WHERE key = 'membership_rules';
  EXCEPTION WHEN OTHERS THEN
    v_welcome_days := 90;
  END;

  IF v_welcome_days IS NULL THEN
    v_welcome_days := 90;
  END IF;

  IF v_welcome_days > 0 THEN
    PERFORM public.grant_membership_credit(
      NEW.id,
      v_welcome_days,
      'welcome',
      'welcome:' || NEW.id::text,
      jsonb_build_object('source', 'signup_welcome', 'days', v_welcome_days)
    );
  END IF;

  RETURN NEW;
END;
$function$;
