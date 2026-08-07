-- ============================================================
-- Migration: Phase 18A — Referral Driven Membership & Audit System
-- Date: 2026-08-07
-- Description: Adds provider & reason fields to user_subscriptions,
-- creates membership_events and premium_audit_logs tables,
-- updates welcome triggers to default to AI_PLUS (referral),
-- and seeds system_settings for referral rewards.
-- ============================================================

BEGIN;

-- 1. Extend user_subscriptions with provider & reason columns
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'referral';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'WELCOME_PROMOTION';

-- 2. Create membership_events table (Immutable Event Log)
CREATE TABLE IF NOT EXISTS public.membership_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_plan TEXT,
  new_plan TEXT,
  provider TEXT DEFAULT 'referral',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.membership_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_events_admin_select" ON public.membership_events;
CREATE POLICY "membership_events_admin_select" ON public.membership_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
    OR profile_id = auth.uid()
  );

GRANT SELECT ON TABLE public.membership_events TO authenticated;
GRANT ALL ON TABLE public.membership_events TO service_role;

-- 3. Create premium_audit_logs table (Admin & System Audit Trail)
CREATE TABLE IF NOT EXISTS public.premium_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value JSONB DEFAULT '{}'::jsonb,
  new_value JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.premium_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "premium_audit_logs_admin_select" ON public.premium_audit_logs;
CREATE POLICY "premium_audit_logs_admin_select" ON public.premium_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );

GRANT SELECT ON TABLE public.premium_audit_logs TO authenticated;
GRANT ALL ON TABLE public.premium_audit_logs TO service_role;

-- 4. Seed system_settings for referral_rewards
INSERT INTO public.system_settings (key, value)
VALUES (
  'referral_rewards',
  jsonb_build_object(
    'welcome_plan', 'ai_plus',
    'welcome_duration_days', 30,
    'referral_reward_days', 30,
    'maximum_reward_days', 365,
    'minimum_verification', 'none',
    'auto_approve', true,
    'promotion_enabled', true
  )
)
ON CONFLICT (key) DO UPDATE
SET value = public.system_settings.value || EXCLUDED.value,
    updated_at = NOW();

-- 5. Updated handle_new_user_subscription Trigger Function (Defaults to AI_PLUS, ACTIVE, REFERRAL)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_welcome_plan TEXT := 'ai_plus';
  v_welcome_days INT := 30;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Query custom referral rewards settings if available
  BEGIN
    SELECT COALESCE(value->>'welcome_plan', 'ai_plus'),
           COALESCE((value->>'welcome_duration_days')::INT, 30)
    INTO v_welcome_plan, v_welcome_days
    FROM public.system_settings
    WHERE key = 'referral_rewards';
  EXCEPTION WHEN OTHERS THEN
    v_welcome_plan := 'ai_plus';
    v_welcome_days := 30;
  END;

  IF v_welcome_days IS NULL OR v_welcome_days <= 0 THEN
    v_welcome_days := 30;
  END IF;

  v_period_end := NOW() + (v_welcome_days || ' days')::INTERVAL;

  -- Create default AI_PLUS active subscription
  INSERT INTO public.user_subscriptions (
    profile_id,
    plan,
    status,
    provider,
    reason,
    current_period_end
  )
  VALUES (
    NEW.id,
    v_welcome_plan,
    'active',
    'referral',
    'WELCOME_PROMOTION',
    v_period_end
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      provider = EXCLUDED.provider,
      reason = EXCLUDED.reason,
      current_period_end = EXCLUDED.current_period_end;

  -- Sync profiles table
  UPDATE public.profiles
  SET premium_tier = v_welcome_plan,
      premium_until = v_period_end
  WHERE id = NEW.id;

  -- Record WELCOME_GRANTED membership event
  INSERT INTO public.membership_events (
    profile_id,
    event_type,
    previous_plan,
    new_plan,
    provider,
    metadata
  ) VALUES (
    NEW.id,
    'WELCOME_GRANTED',
    NULL,
    v_welcome_plan,
    'referral',
    jsonb_build_object(
      'duration_days', v_welcome_days,
      'reason', 'WELCOME_PROMOTION'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

COMMIT;
