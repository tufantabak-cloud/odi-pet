-- ============================================================
-- Migration: Phase 18 — Membership Lifecycle Engine
-- Kurallar:
--   Her yeni kullanıcı: AI+ 60 gün → PRO 60 gün → FREE
--   Referral ile gün kazanılır, süreler uzatılır
-- ============================================================

BEGIN;

-- 1. user_subscriptions lifecycle kolonları (idempotent)
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS ai_plus_until   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_until       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS earned_days     INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider        TEXT NOT NULL DEFAULT 'referral',
  ADD COLUMN IF NOT EXISTS reason          TEXT;

-- 2. Backfill mevcut kayıtları (yeni kolonlar NULL ise doldur)
UPDATE public.user_subscriptions
SET
  ai_plus_until = COALESCE(
    ai_plus_until,
    created_at + INTERVAL '60 days',
    NOW() + INTERVAL '60 days'
  ),
  pro_until = COALESCE(
    pro_until,
    created_at + INTERVAL '120 days',
    NOW() + INTERVAL '120 days'
  ),
  current_period_end = COALESCE(
    current_period_end,
    created_at + INTERVAL '120 days',
    NOW() + INTERVAL '120 days'
  ),
  plan = COALESCE(plan, 'ai_plus'),
  status = COALESCE(status, 'active'),
  provider = COALESCE(provider, 'referral'),
  reason = COALESCE(reason, 'WELCOME_PROMOTION')
WHERE ai_plus_until IS NULL OR pro_until IS NULL;

-- 3. profiles tablosuna lifecycle kolonları (varsa skip)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_tier  TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- 4. Yeni kayıt trigger fonksiyonu (60d AI+ → 60d PRO → FREE)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_ai_plus_days CONSTANT INT := 60;
  v_pro_days     CONSTANT INT := 60;
  v_ai_plus_end  TIMESTAMPTZ;
  v_pro_end      TIMESTAMPTZ;
BEGIN
  v_ai_plus_end := NOW() + (v_ai_plus_days || ' days')::INTERVAL;
  v_pro_end     := v_ai_plus_end + (v_pro_days || ' days')::INTERVAL;

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
    SET plan              = 'ai_plus',
        status            = 'active',
        provider          = 'referral',
        reason            = 'WELCOME_PROMOTION',
        ai_plus_until     = EXCLUDED.ai_plus_until,
        pro_until         = EXCLUDED.pro_until,
        current_period_end = EXCLUDED.current_period_end
  WHERE user_subscriptions.ai_plus_until IS NULL;   -- sadece hiç başlatılmamışsa güncelle

  UPDATE public.profiles
  SET premium_tier  = 'ai_plus',
      premium_until = v_pro_end
  WHERE id = NEW.id;

  INSERT INTO public.membership_events (
    profile_id, event_type, previous_plan, new_plan, provider, metadata
  ) VALUES (
    NEW.id,
    'WELCOME_GRANTED',
    NULL,
    'ai_plus',
    'referral',
    jsonb_build_object(
      'ai_plus_days', v_ai_plus_days,
      'pro_days',     v_pro_days,
      'reason',       'WELCOME_PROMOTION'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger'ı bağla (profiles INSERT sonrası)
DROP TRIGGER IF EXISTS on_new_profile_subscription ON public.profiles;
CREATE TRIGGER on_new_profile_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- 6. Lifecycle downgrade fonksiyonu (cron çağırır)
CREATE OR REPLACE FUNCTION public.run_membership_lifecycle_downgrade()
RETURNS JSONB AS $$
DECLARE
  v_now          TIMESTAMPTZ := NOW();
  v_downgraded   INT := 0;
  v_to_pro       INT := 0;
  v_to_free      INT := 0;
  rec            RECORD;
BEGIN
  -- AI+ süresi bitti → PRO'ya düşür
  FOR rec IN
    SELECT id, profile_id
    FROM public.user_subscriptions
    WHERE plan = 'ai_plus'
      AND status IN ('active', 'trialing')
      AND ai_plus_until IS NOT NULL
      AND ai_plus_until < v_now
      AND (pro_until IS NULL OR pro_until > v_now)  -- PRO hâlâ geçerli
  LOOP
    UPDATE public.user_subscriptions
    SET plan     = 'pro',
        reason   = 'LIFECYCLE_DOWNGRADE_AI_TO_PRO'
    WHERE id = rec.id;

    UPDATE public.profiles
    SET premium_tier = 'pro'
    WHERE id = rec.profile_id;

    INSERT INTO public.membership_events (
      profile_id, event_type, previous_plan, new_plan, provider, metadata
    ) VALUES (
      rec.profile_id, 'DOWNGRADED', 'ai_plus', 'pro', 'system',
      jsonb_build_object('reason', 'AI+ period ended, downgrading to PRO')
    );

    v_to_pro := v_to_pro + 1;
  END LOOP;

  -- PRO süresi de bitti → FREE'ye düşür
  FOR rec IN
    SELECT id, profile_id, plan
    FROM public.user_subscriptions
    WHERE plan IN ('pro', 'ai_plus')
      AND status IN ('active', 'trialing')
      AND pro_until IS NOT NULL
      AND pro_until < v_now
  LOOP
    UPDATE public.user_subscriptions
    SET plan     = 'free',
        status   = 'expired',
        reason   = 'LIFECYCLE_DOWNGRADE_PRO_TO_FREE'
    WHERE id = rec.id;

    UPDATE public.profiles
    SET premium_tier  = 'free',
        premium_until = NULL
    WHERE id = rec.profile_id;

    INSERT INTO public.membership_events (
      profile_id, event_type, previous_plan, new_plan, provider, metadata
    ) VALUES (
      rec.profile_id, 'EXPIRED', rec.plan, 'free', 'system',
      jsonb_build_object('reason', 'PRO period ended, downgrading to FREE')
    );

    v_to_free := v_to_free + 1;
  END LOOP;

  v_downgraded := v_to_pro + v_to_free;

  RETURN jsonb_build_object(
    'processed_at', v_now,
    'total_downgraded', v_downgraded,
    'ai_to_pro', v_to_pro,
    'pro_to_free', v_to_free
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. profiles tablosu için mevcut kullanıcılara backfill (premium_tier yoksa)
UPDATE public.profiles p
SET
  premium_tier = CASE
    WHEN us.ai_plus_until > NOW() THEN 'ai_plus'
    WHEN us.pro_until > NOW()     THEN 'pro'
    ELSE 'free'
  END,
  premium_until = CASE
    WHEN us.pro_until > NOW() THEN us.pro_until
    ELSE NULL
  END
FROM public.user_subscriptions us
WHERE us.profile_id = p.id
  AND (p.premium_tier IS NULL OR p.premium_tier = 'free');

COMMIT;
