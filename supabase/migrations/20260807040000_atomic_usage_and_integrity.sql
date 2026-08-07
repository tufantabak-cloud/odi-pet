-- =============================================================================
-- Feature Registry - Phase 8 Core Hardening: Atomic Usage, Idempotency & Kill Switches
-- Migration : 20260807040000_atomic_usage_and_integrity.sql
-- =============================================================================

BEGIN;

-- 1. Idempotency Log Store for full response replay
CREATE TABLE IF NOT EXISTS feature_idempotency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  CONSTRAINT uq_idempotency_key_feature UNIQUE (idempotency_key, feature_key, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON feature_idempotency_logs (idempotency_key, profile_id);

-- 2. Emergency Global Kill Switches Table
CREATE TABLE IF NOT EXISTS feature_kill_switches (
  feature_key TEXT PRIMARY KEY,
  disabled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  disabled_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

-- 3. Enhance Version Integrity Columns
ALTER TABLE feature_limits_versions
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT,
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS registry_hash TEXT;

-- 4. Atomic Usage RPC Function (SELECT ... FOR UPDATE) with Rich DTO Return
CREATE OR REPLACE FUNCTION consume_feature_usage(
  p_profile_id UUID,
  p_feature_key TEXT,
  p_pet_id UUID DEFAULT NULL,
  p_amount INT DEFAULT 1,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_request_id UUID := gen_random_uuid();
  v_is_killed BOOLEAN;
  v_idempotent_record RECORD;
  v_user_plan TEXT := 'free';
  v_limit_record RECORD;
  v_current_usage INT := 0;
  v_new_usage INT := 0;
  v_remaining INT := 0;
  v_reset_at TIMESTAMPTZ;
  v_response JSONB;
BEGIN
  -- A. Kill Switch Check
  SELECT EXISTS(SELECT 1 FROM feature_kill_switches WHERE feature_key = p_feature_key) INTO v_is_killed;
  IF v_is_killed THEN
    RETURN jsonb_build_object(
      'success', false,
      'allowed', false,
      'reason', 'FEATURE_DISABLED_BY_KILL_SWITCH',
      'used', 0,
      'remaining', 0,
      'limit', 0,
      'reset_at', NULL,
      'request_id', v_request_id
    );
  END IF;

  -- B. Idempotency Check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response_json INTO v_idempotent_record 
    FROM feature_idempotency_logs 
    WHERE idempotency_key = p_idempotency_key 
      AND feature_key = p_feature_key 
      AND profile_id = p_profile_id;

    IF FOUND THEN
      v_response := v_idempotent_record.response_json;
      v_response := jsonb_set(v_response, '{reason}', '"IDEMPOTENCE_REPLAY"');
      RETURN v_response;
    END IF;
  END IF;

  -- C. Fetch User Plan
  SELECT COALESCE(premium_tier, 'free') INTO v_user_plan FROM profiles WHERE id = p_profile_id;

  -- D. Fetch Limit Definition
  SELECT limit_type, limit_value, window_value, window_unit, is_enabled 
  INTO v_limit_record 
  FROM feature_limits 
  WHERE feature_key = p_feature_key AND plan = v_user_plan;

  IF NOT FOUND OR v_limit_record.is_enabled = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'allowed', false,
      'reason', 'FEATURE_DISABLED',
      'used', 0,
      'remaining', 0,
      'limit', 0,
      'reset_at', NULL,
      'request_id', v_request_id
    );
  END IF;

  -- E. Unlimited Handling
  IF v_limit_record.limit_type = 'unlimited' THEN
    v_response := jsonb_build_object(
      'success', true,
      'allowed', true,
      'reason', 'OK',
      'used', 0,
      'remaining', -1,
      'limit', -1,
      'reset_at', NULL,
      'request_id', v_request_id
    );
    RETURN v_response;
  END IF;

  -- F. Quota Consumption with ROW LOCK (SELECT ... FOR UPDATE)
  IF v_limit_record.limit_type = 'quota' THEN
    -- Calculate window reset
    v_reset_at := now() + INTERVAL '30 days';

    -- Lock existing usage row to prevent race condition
    SELECT COALESCE(usage_count, 0) INTO v_current_usage
    FROM feature_usage
    WHERE profile_id = p_profile_id 
      AND feature_key = p_feature_key 
      AND (pet_id = p_pet_id OR (pet_id IS NULL AND p_pet_id IS NULL))
    FOR UPDATE;

    IF v_current_usage IS NULL THEN
      v_current_usage := 0;
    END IF;

    -- Check limit
    IF (v_current_usage + p_amount) > v_limit_record.limit_value THEN
      v_response := jsonb_build_object(
        'success', false,
        'allowed', false,
        'reason', 'QUOTA_EXCEEDED',
        'used', v_current_usage,
        'remaining', GREATEST(0, v_limit_record.limit_value - v_current_usage),
        'limit', v_limit_record.limit_value,
        'reset_at', v_reset_at,
        'request_id', v_request_id
      );
      RETURN v_response;
    END IF;

    -- Atomic Upsert Increment
    v_new_usage := v_current_usage + p_amount;
    v_remaining := GREATEST(0, v_limit_record.limit_value - v_new_usage);

    INSERT INTO feature_usage (profile_id, feature_key, pet_id, usage_count, window_start, window_end)
    VALUES (p_profile_id, p_feature_key, p_pet_id, p_new_usage, now(), v_reset_at)
    ON CONFLICT (profile_id, feature_key, COALESCE(pet_id, '00000000-0000-0000-0000-000000000000')) 
    DO UPDATE SET 
      usage_count = feature_usage.usage_count + p_amount,
      updated_at = now();

    v_response := jsonb_build_object(
      'success', true,
      'allowed', true,
      'reason', 'OK',
      'used', v_new_usage,
      'remaining', v_remaining,
      'limit', v_limit_record.limit_value,
      'reset_at', v_reset_at,
      'request_id', v_request_id
    );

    -- Save Idempotency Log if key provided
    IF p_idempotency_key IS NOT NULL THEN
      INSERT INTO feature_idempotency_logs (idempotency_key, feature_key, profile_id, response_json)
      VALUES (p_idempotency_key, p_feature_key, p_profile_id, v_response)
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_response;
  END IF;

  -- Default Boolean / Enabled
  RETURN jsonb_build_object(
    'success', true,
    'allowed', true,
    'reason', 'OK',
    'used', 0,
    'remaining', -1,
    'limit', -1,
    'reset_at', NULL,
    'request_id', v_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
