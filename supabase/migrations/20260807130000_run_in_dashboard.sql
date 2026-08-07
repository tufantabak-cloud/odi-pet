-- ============================================================
-- Odi.Pet Membership Lifecycle — Supabase Dashboard SQL (FIXED)
-- ADIM ADIM ÇALIŞTIRIN — her adımı ayrı ayrı run edebilirsiniz
-- ============================================================

-- ── ADIM 1: Kolonları ekle ───────────────────────────────────
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS ai_plus_until  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_until      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS earned_days    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider       TEXT NOT NULL DEFAULT 'referral',
  ADD COLUMN IF NOT EXISTS reason         TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_tier  TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- ── ADIM 2: Mevcut subscription'ları backfill et ─────────────
UPDATE public.user_subscriptions
SET
  ai_plus_until      = COALESCE(ai_plus_until,      created_at + INTERVAL '60 days',  NOW() + INTERVAL '60 days'),
  pro_until          = COALESCE(pro_until,           created_at + INTERVAL '120 days', NOW() + INTERVAL '120 days'),
  current_period_end = COALESCE(current_period_end,  created_at + INTERVAL '120 days', NOW() + INTERVAL '120 days'),
  plan               = COALESCE(plan,    'ai_plus'),
  status             = COALESCE(status,  'active'),
  provider           = COALESCE(provider, 'referral'),
  reason             = COALESCE(reason,  'WELCOME_PROMOTION')
WHERE ai_plus_until IS NULL OR pro_until IS NULL;

-- ── ADIM 3: Subscription OLMAYAN kullanıcılara AI+ ver ───────
INSERT INTO public.user_subscriptions (
  profile_id, plan, status, provider, reason,
  ai_plus_until, pro_until, current_period_end, earned_days
)
SELECT
  p.id,
  'ai_plus',
  'active',
  'referral',
  'WELCOME_PROMOTION',
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '120 days',
  NOW() + INTERVAL '120 days',
  0
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON us.profile_id = p.id
WHERE us.id IS NULL
ON CONFLICT (profile_id) DO NOTHING;

-- ── ADIM 4: Profiles tablosunu senkronize et ─────────────────
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
WHERE us.profile_id = p.id;

-- ── ADIM 5: Yeni kayıt trigger fonksiyonu ($func$ kullanılıyor) ──
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $func$
DECLARE
  v_ai_plus_end TIMESTAMPTZ;
  v_pro_end     TIMESTAMPTZ;
BEGIN
  v_ai_plus_end := NOW() + INTERVAL '60 days';
  v_pro_end     := NOW() + INTERVAL '120 days';

  INSERT INTO public.user_subscriptions (
    profile_id, plan, status, provider, reason,
    ai_plus_until, pro_until, current_period_end, earned_days
  )
  VALUES (
    NEW.id, 'ai_plus', 'active', 'referral', 'WELCOME_PROMOTION',
    v_ai_plus_end, v_pro_end, v_pro_end, 0
  )
  ON CONFLICT (profile_id) DO NOTHING;

  UPDATE public.profiles
  SET premium_tier = 'ai_plus', premium_until = v_pro_end
  WHERE id = NEW.id;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── ADIM 6: Trigger bağla ─────────────────────────────────────
DROP TRIGGER IF EXISTS on_new_profile_subscription ON public.profiles;
CREATE TRIGGER on_new_profile_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- ── ADIM 7: Sonucu kontrol et ─────────────────────────────────
SELECT
  p.email,
  us.plan,
  us.status,
  CASE
    WHEN us.ai_plus_until > NOW()
      THEN CEIL(EXTRACT(EPOCH FROM (us.ai_plus_until - NOW())) / 86400)::INT
    ELSE 0
  END AS kalan_ai_plus_gun,
  CASE
    WHEN us.pro_until > NOW() AND (us.ai_plus_until IS NULL OR us.ai_plus_until <= NOW())
      THEN CEIL(EXTRACT(EPOCH FROM (us.pro_until - NOW())) / 86400)::INT
    ELSE 0
  END AS kalan_pro_gun,
  us.ai_plus_until,
  us.pro_until
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON us.profile_id = p.id
ORDER BY p.created_at DESC
LIMIT 20;
