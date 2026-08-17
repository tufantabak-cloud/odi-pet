-- Fix consume_feature_usage to read actual user plan from user_subscriptions

CREATE OR REPLACE FUNCTION public.consume_feature_usage(
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
  v_user_plan TEXT := 'free'; -- Default fallback
  v_limit_record RECORD;
  v_current_usage INT := 0;
  v_new_usage INT := 0;
  v_remaining INT := 0;
  v_reset_at TIMESTAMPTZ;
  v_response JSONB;
  v_sub RECORD;
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

  -- C. Fetch User Plan from user_subscriptions
  SELECT plan, status, ai_plus_until, pro_until 
  INTO v_sub
  FROM public.user_subscriptions
  WHERE profile_id = p_profile_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_sub.ai_plus_until IS NOT NULL AND v_sub.ai_plus_until > now() THEN
      v_user_plan := 'ai_plus';
    ELSIF v_sub.pro_until IS NOT NULL AND v_sub.pro_until > now() THEN
      v_user_plan := 'pro';
    ELSIF v_sub.plan IS NOT NULL AND v_sub.plan != 'free' THEN
      v_user_plan := v_sub.plan;
    END IF;
  END IF;

  -- D. Fetch Limit Definition
  SELECT limit_type, limit_value, window_value, window_unit, is_enabled 
  INTO v_limit_record 
  FROM feature_limits 
  WHERE feature_key = p_feature_key AND plan_tier = v_user_plan::plan_tier_enum;

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
    SELECT COALESCE(count, 0) INTO v_current_usage
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
      
      -- Save Idempotency Log even for failures
      IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO feature_idempotency_logs (idempotency_key, feature_key, profile_id, response_json)
        VALUES (p_idempotency_key, p_feature_key, p_profile_id, v_response)
        ON CONFLICT DO NOTHING;
      END IF;

      RETURN v_response;
    END IF;

    -- Atomic Upsert Increment
    v_new_usage := v_current_usage + p_amount;
    v_remaining := GREATEST(0, v_limit_record.limit_value - v_new_usage);

    IF p_pet_id IS NULL THEN
      INSERT INTO feature_usage (profile_id, feature_key, count, window_start)
      VALUES (p_profile_id, p_feature_key, v_new_usage, now()::date)
      ON CONFLICT (profile_id, feature_key, window_start) WHERE pet_id IS NULL
      DO UPDATE SET 
        count = feature_usage.count + p_amount,
        updated_at = now();
    ELSE
      INSERT INTO feature_usage (profile_id, feature_key, pet_id, count, window_start)
      VALUES (p_profile_id, p_feature_key, p_pet_id, v_new_usage, now()::date)
      ON CONFLICT (profile_id, feature_key, pet_id, window_start) WHERE pet_id IS NOT NULL
      DO UPDATE SET 
        count = feature_usage.count + p_amount,
        updated_at = now();
    END IF;

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
