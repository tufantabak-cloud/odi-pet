-- Migration: 20260816014054_refactor_grant_membership_credit_ssot.sql
-- Description: Refactors grant_membership_credit to use user_subscriptions as the SSOT
--              while preserving all existing API signatures, idempotency, caps, and cache behaviors.

BEGIN;

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
  v_ai_plus_until TIMESTAMPTZ;
  v_pro_until TIMESTAMPTZ;
  v_new_until TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_max_until TIMESTAMPTZ := v_now + INTERVAL '365 days';
  v_existing_id UUID;
  v_target_plan TEXT;
  v_added_interval INTERVAL;
  v_granted_until TIMESTAMPTZ;
BEGIN
  -- 1. Idempotency kontrolü (membership_credits üzerinden garanti altındadır)
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

  -- 2. SSOT üzerinden FOR UPDATE kilitli okuma (Eskiden profiles kilitlenirdi, artık asıl tablo kilitleniyor)
  SELECT ai_plus_until, pro_until INTO v_ai_plus_until, v_pro_until
  FROM public.user_subscriptions
  WHERE profile_id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found for profile: %', p_profile_id;
  END IF;

  -- 3. Aktif plana göre süre uzatma (Rolling extension)
  IF v_ai_plus_until IS NOT NULL AND v_ai_plus_until > v_now THEN
    -- AI+ Aktif: AI+ süresini uzat
    v_new_until := v_ai_plus_until + (p_days || ' days')::INTERVAL;
    IF v_new_until > v_max_until THEN 
      v_new_until := v_max_until; 
    END IF;
    
    v_added_interval := v_new_until - v_ai_plus_until;
    v_ai_plus_until := v_new_until;
    
    -- PRO süresi de ötelensin (kullanıcı AI+ ödülü aldı diye ardışık PRO süresi erimesin)
    IF v_pro_until IS NOT NULL AND v_pro_until > v_now THEN
      v_pro_until := v_pro_until + v_added_interval;
    END IF;
    
    v_target_plan := 'ai_plus';
    v_granted_until := v_ai_plus_until;

  ELSIF v_pro_until IS NOT NULL AND v_pro_until > v_now THEN
    -- PRO Aktif: Sadece PRO süresini uzat
    v_new_until := v_pro_until + (p_days || ' days')::INTERVAL;
    IF v_new_until > v_max_until THEN 
      v_new_until := v_max_until; 
    END IF;
    
    v_pro_until := v_new_until;
    v_target_plan := 'pro';
    v_granted_until := v_pro_until;

  ELSE
    -- Hiçbiri aktif değil: Yeni PRO süresi başlat (Eski sistemdeki varsayılan davranış)
    v_new_until := v_now + (p_days || ' days')::INTERVAL;
    IF v_new_until > v_max_until THEN 
      v_new_until := v_max_until; 
    END IF;
    
    v_pro_until := v_new_until;
    v_target_plan := 'pro';
    v_granted_until := v_pro_until;
  END IF;

  -- 4. SSOT Güncellemesi
  UPDATE public.user_subscriptions
  SET
    ai_plus_until = v_ai_plus_until,
    pro_until = v_pro_until,
    current_period_end = GREATEST(v_ai_plus_until, v_pro_until),
    plan = v_target_plan,
    status = 'active'
  WHERE profile_id = p_profile_id;

  -- 5. Kredi defterine işle (Mevcut davranış aynen korunuyor)
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

  -- 6. Derived Cache Güncellemesi (profiles tablosu)
  UPDATE public.profiles
  SET 
    premium_until = v_granted_until,
    premium_tier = v_target_plan
  WHERE id = p_profile_id;

  -- 7. Mevcut JSON response imzasını aynen döndür
  RETURN jsonb_build_object(
    'success', true,
    'already_granted', false,
    'profile_id', p_profile_id,
    'premium_until', v_granted_until,
    'granted_days', p_days
  );
END;
$function$;

-- Önceki forensic audit doğrultusunda güvenlik izinlerini restore et (Sadece Service Role kullanabilir)
REVOKE ALL PRIVILEGES ON FUNCTION public.grant_membership_credit(UUID, INT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_membership_credit(UUID, INT, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================
-- 2. get_credit_entitlement RPC (Salt Okunur / Kanonik Oku)
-- ============================================================
-- Bu fonksiyon eskiden profiles tablosundan okuyordu.
-- Şimdi zorunlu olarak user_subscriptions tablosunu kaynak alıyor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_credit_entitlement(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_sub RECORD;
  v_until TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_days_left INT := 0;
BEGIN
  -- Kanonik kaynağı sorgula
  SELECT plan, ai_plus_until, pro_until, current_period_end
  INTO v_sub
  FROM public.user_subscriptions
  WHERE profile_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tier', 'free', 'source', 'none', 'valid_until', NULL, 
      'days_left', 0, 'is_premium', false, 'has_ai_plus', false
    );
  END IF;

  -- En uzak bitiş tarihini bul
  v_until := GREATEST(v_sub.ai_plus_until, v_sub.pro_until);

  IF v_until IS NOT NULL AND v_until > v_now THEN
    v_days_left := CEIL(EXTRACT(EPOCH FROM (v_until - v_now)) / 86400)::INT;
    
    -- Anlık duruma göre tier belirle (plan bilgisi geride kalmış olabilir diye double-check)
    RETURN jsonb_build_object(
      'tier', CASE WHEN v_sub.ai_plus_until > v_now THEN 'ai_plus' ELSE 'pro' END,
      'source', 'subscription',
      'valid_until', v_until,
      'days_left', v_days_left,
      'is_premium', true,
      'has_ai_plus', (v_sub.ai_plus_until > v_now)
    );
  END IF;

  -- Süre dolmuş
  RETURN jsonb_build_object(
    'tier', 'free',
    'source', 'expired',
    'valid_until', NULL,
    'days_left', 0,
    'is_premium', false,
    'has_ai_plus', false
  );
END;
$function$;

COMMIT;
