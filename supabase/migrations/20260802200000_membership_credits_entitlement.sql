-- Migration: Membership Credits & Entitlement Architecture (Phase A)
-- Created: 2026-08-02

BEGIN;

-- ============================================================
-- §0. Bağımlılık Güvencesi (Dependency Guard)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'founder')
  );
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.is_admin_or_founder() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_founder() TO authenticated, service_role;

-- Ensure pro_trial_until column exists for backward safety
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_trial_until TIMESTAMPTZ;

-- Ensure referrals table exists
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- ============================================================
-- 1. Profiles Tablosu Güncellemesi (premium_until, premium_tier)
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_tier TEXT DEFAULT NULL;

-- Devredilen eski pro_trial_until verisini aktar
UPDATE public.profiles
SET premium_until = pro_trial_until,
    premium_tier = 'pro'
WHERE premium_until IS NULL
  AND pro_trial_until IS NOT NULL;

-- ============================================================
-- 2. Kredi Defteri Tablosu (membership_credits)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.membership_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credit_days INT NOT NULL CHECK (credit_days > 0),
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.membership_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_credits_select_own_or_admin" ON public.membership_credits;
CREATE POLICY "membership_credits_select_own_or_admin" ON public.membership_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id OR public.is_admin_or_founder());

REVOKE ALL PRIVILEGES ON TABLE public.membership_credits FROM anon, authenticated;
GRANT SELECT ON TABLE public.membership_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.membership_credits TO service_role;

-- ============================================================
-- 3. Referrals Tablosu Durum Alanları (referrals.status vb.)
-- ============================================================

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================================
-- 4. grant_membership_credit RPC Fonksiyonu
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_membership_credit(
  p_profile_id UUID,
  p_days INT,
  p_reason TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_current_until TIMESTAMPTZ;
  v_new_until TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_max_until TIMESTAMPTZ := v_now + INTERVAL '365 days';
  v_existing_id UUID;
BEGIN
  -- 1. Idempotency kontrolü
  SELECT id INTO v_existing_id
  FROM public.membership_credits
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_granted', true,
      'idempotency_key', p_idempotency_key
    );
  END IF;

  -- 2. Satır seviyesinde kilit ile mevcut premium_until değerini oku
  SELECT premium_until INTO v_current_until
  FROM public.profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  -- 3. Rolling uzatma hesabı
  IF v_current_until IS NULL OR v_current_until < v_now THEN
    v_new_until := v_now + (p_days || ' days')::INTERVAL;
  ELSE
    v_new_until := v_current_until + (p_days || ' days')::INTERVAL;
  END IF;

  -- 4. 365 gün tavan kontrolü
  IF v_new_until > v_max_until THEN
    v_new_until := v_max_until;
  END IF;

  -- 5. Kredi defterine işle
  INSERT INTO public.membership_credits (
    profile_id,
    credit_days,
    reason,
    idempotency_key,
    metadata
  ) VALUES (
    p_profile_id,
    p_days,
    p_reason,
    p_idempotency_key,
    p_metadata
  );

  -- 6. Profile güncelle
  UPDATE public.profiles
  SET premium_until = v_new_until,
      premium_tier = 'pro'
  WHERE id = p_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_granted', false,
    'profile_id', p_profile_id,
    'premium_until', v_new_until,
    'granted_days', p_days
  );
END;
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.grant_membership_credit(UUID, INT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_membership_credit(UUID, INT, TEXT, TEXT, JSONB) TO authenticated, service_role;

-- ============================================================
-- 5. Hoş Geldin Kredisi Trigger'ı (Yeni Kullanıcılar)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_profile_welcome_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_welcome_days CONSTANT INT := 90;
BEGIN
  PERFORM public.grant_membership_credit(
    NEW.id,
    v_welcome_days,
    'welcome',
    'welcome:' || NEW.id::text,
    jsonb_build_object('source', 'signup_welcome')
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_profile_created_welcome_credit ON public.profiles;
CREATE TRIGGER on_profile_created_welcome_credit
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_welcome_credit();

-- ============================================================
-- 6. STABLE Okuma Fonksiyonu (get_credit_entitlement)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_credit_entitlement(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_until TIMESTAMPTZ;
  v_tier TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_days_left INT := 0;
BEGIN
  SELECT premium_until, COALESCE(premium_tier, 'pro')
  INTO v_until, v_tier
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_until IS NOT NULL AND v_until > v_now THEN
    v_days_left := CEIL(EXTRACT(EPOCH FROM (v_until - v_now)) / 86400)::INT;
    RETURN jsonb_build_object(
      'tier', v_tier,
      'source', 'credit',
      'valid_until', v_until,
      'days_left', v_days_left,
      'is_premium', true,
      'has_ai_plus', (v_tier = 'ai_plus')
    );
  END IF;

  RETURN jsonb_build_object(
    'tier', 'free',
    'source', 'none',
    'valid_until', NULL,
    'days_left', 0,
    'is_premium', false,
    'has_ai_plus', false
  );
END;
$function$;

REVOKE ALL PRIVILEGES ON FUNCTION public.get_credit_entitlement(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_credit_entitlement(UUID) TO authenticated, service_role;

-- ============================================================
-- 7. Backfill: Mevcut Tüm Kullanıcılara 90 Gün Hoş Geldin Kredisi
-- ============================================================

DO $backfill$
DECLARE
  v_rec RECORD;
  v_count INT := 0;
  v_welcome_days CONSTANT INT := 90;
BEGIN
  FOR v_rec IN SELECT id FROM public.profiles LOOP
    PERFORM public.grant_membership_credit(
      v_rec.id,
      v_welcome_days,
      'welcome',
      'welcome:' || v_rec.id::text,
      jsonb_build_object('source', 'existing_user_backfill')
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Membership Credit Backfill tamamlandı: % profille 90 gün hoş geldin kredisi tanımlandı.', v_count;
END;
$backfill$;

COMMIT;
