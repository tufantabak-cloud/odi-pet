-- ============================================================
-- Migration: Phase 18A — 60-Day AI+ -> 60-Day PRO -> FREE Lifecycle
-- Date: 2026-08-07
-- Description: Adds ai_plus_until, pro_until, earned_days, referrer_id to user_subscriptions,
-- ensures referrals table schema matches spec,
-- updates handle_new_user_subscription() for 60d AI+ / 60d PRO default.
-- ============================================================

BEGIN;

-- 1. Extend user_subscriptions with lifecycle columns
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS ai_plus_until TIMESTAMPTZ;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS earned_days INT DEFAULT 0;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Ensure referrals table columns match spec
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'qualified',
  reward_days INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_days INT NOT NULL DEFAULT 30;

-- 3. Update handle_new_user_subscription() Trigger Function (60 Days AI+ -> 60 Days PRO -> FREE)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_ai_plus_days CONSTANT INT := 60;
  v_pro_days CONSTANT INT := 60;
  v_ai_plus_end TIMESTAMPTZ;
  v_pro_end TIMESTAMPTZ;
BEGIN
  v_ai_plus_end := NOW() + (v_ai_plus_days || ' days')::INTERVAL;
  v_pro_end := v_ai_plus_end + (v_pro_days || ' days')::INTERVAL;

  INSERT INTO public.user_subscriptions (
    profile_id,
    plan,
    status,
    provider,
    reason,
    ai_plus_until,
    pro_until,
    current_period_end,
    earned_days
  )
  VALUES (
    NEW.id,
    'ai_plus',
    'active',
    'referral',
    'WELCOME_PROMOTION',
    v_ai_plus_end,
    v_pro_end,
    v_pro_end,
    0
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET plan = 'ai_plus',
      status = 'active',
      provider = 'referral',
      reason = 'WELCOME_PROMOTION',
      ai_plus_until = EXCLUDED.ai_plus_until,
      pro_until = EXCLUDED.pro_until,
      current_period_end = EXCLUDED.current_period_end;

  UPDATE public.profiles
  SET premium_tier = 'ai_plus',
      premium_until = v_pro_end
  WHERE id = NEW.id;

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
    'ai_plus',
    'referral',
    jsonb_build_object(
      'ai_plus_days', v_ai_plus_days,
      'pro_days', v_pro_days,
      'reason', 'WELCOME_PROMOTION'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Backfill existing user_subscriptions with initial lifecycle endpoints if null
UPDATE public.user_subscriptions
SET ai_plus_until = COALESCE(ai_plus_until, created_at + INTERVAL '60 days', NOW() + INTERVAL '60 days'),
    pro_until = COALESCE(pro_until, created_at + INTERVAL '120 days', NOW() + INTERVAL '120 days'),
    current_period_end = COALESCE(current_period_end, pro_until, NOW() + INTERVAL '120 days')
WHERE ai_plus_until IS NULL OR pro_until IS NULL;

COMMIT;
