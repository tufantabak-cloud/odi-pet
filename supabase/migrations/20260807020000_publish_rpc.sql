-- =============================================================================
-- Feature Registry - Phase 8: Publish & Rollback RPC
-- Migration : 20260807020000_publish_rpc.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION publish_feature_limits(p_published_by UUID, p_description TEXT, p_ip TEXT)
RETURNS jsonb AS $$
DECLARE
  v_drafts JSONB;
  v_draft_count INT;
BEGIN
  -- 1. Fetch all drafts as JSONB
  SELECT jsonb_agg(row_to_json(d)) INTO v_drafts FROM feature_limits_draft d;
  
  IF v_drafts IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No drafts found to publish');
  END IF;

  SELECT COUNT(*) INTO v_draft_count FROM feature_limits_draft;

  -- 2. Upsert to feature_limits
  INSERT INTO feature_limits (
    feature_key, plan, is_enabled, limit_type, limit_value, window_value, window_unit, carry_over_policy, burst_limit
  )
  SELECT 
    feature_key, plan, is_enabled, limit_type, limit_value, window_value, window_unit, carry_over_policy, burst_limit
  FROM feature_limits_draft
  ON CONFLICT (feature_key, plan) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    limit_type = EXCLUDED.limit_type,
    limit_value = EXCLUDED.limit_value,
    window_value = EXCLUDED.window_value,
    window_unit = EXCLUDED.window_unit,
    carry_over_policy = EXCLUDED.carry_over_policy,
    burst_limit = EXCLUDED.burst_limit,
    updated_at = now();

  -- 3. Save snapshot
  INSERT INTO feature_limits_versions (published_by, description, limits_snapshot)
  VALUES (p_published_by, p_description, v_drafts);

  -- 4. Audit log
  INSERT INTO premium_audit_logs (user_id, action_type, ip_address, new_value)
  VALUES (p_published_by, 'LIMITS_PUBLISHED', p_ip, v_drafts);

  RETURN jsonb_build_object('success', true, 'count', v_draft_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rollback_feature_limits(p_version_id UUID, p_published_by UUID, p_ip TEXT)
RETURNS jsonb AS $$
DECLARE
  v_snapshot JSONB;
  v_description TEXT;
BEGIN
  -- 1. Get the snapshot
  SELECT limits_snapshot, description INTO v_snapshot, v_description 
  FROM feature_limits_versions WHERE id = p_version_id;

  IF v_snapshot IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Version not found');
  END IF;

  -- 2. Restore to feature_limits
  INSERT INTO feature_limits (
    feature_key, plan, is_enabled, limit_type, limit_value, window_value, window_unit, carry_over_policy, burst_limit
  )
  SELECT 
    (elem->>'feature_key')::TEXT, 
    (elem->>'plan')::TEXT, 
    (elem->>'is_enabled')::BOOLEAN, 
    (elem->>'limit_type')::TEXT, 
    (NULLIF(elem->>'limit_value', 'null'))::INTEGER, 
    (NULLIF(elem->>'window_value', 'null'))::INTEGER, 
    (elem->>'window_unit')::TEXT, 
    COALESCE((elem->>'carry_over_policy')::TEXT, 'none'), 
    (NULLIF(elem->>'burst_limit', 'null'))::INTEGER
  FROM jsonb_array_elements(v_snapshot) AS elem
  ON CONFLICT (feature_key, plan) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    limit_type = EXCLUDED.limit_type,
    limit_value = EXCLUDED.limit_value,
    window_value = EXCLUDED.window_value,
    window_unit = EXCLUDED.window_unit,
    carry_over_policy = EXCLUDED.carry_over_policy,
    burst_limit = EXCLUDED.burst_limit,
    updated_at = now();

  -- 3. Also restore to drafts
  INSERT INTO feature_limits_draft (
    feature_key, plan, is_enabled, limit_type, limit_value, window_value, window_unit, carry_over_policy, burst_limit
  )
  SELECT 
    (elem->>'feature_key')::TEXT, 
    (elem->>'plan')::TEXT, 
    (elem->>'is_enabled')::BOOLEAN, 
    (elem->>'limit_type')::TEXT, 
    (NULLIF(elem->>'limit_value', 'null'))::INTEGER, 
    (NULLIF(elem->>'window_value', 'null'))::INTEGER, 
    (elem->>'window_unit')::TEXT, 
    COALESCE((elem->>'carry_over_policy')::TEXT, 'none'), 
    (NULLIF(elem->>'burst_limit', 'null'))::INTEGER
  FROM jsonb_array_elements(v_snapshot) AS elem
  ON CONFLICT (feature_key, plan) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    limit_type = EXCLUDED.limit_type,
    limit_value = EXCLUDED.limit_value,
    window_value = EXCLUDED.window_value,
    window_unit = EXCLUDED.window_unit,
    carry_over_policy = EXCLUDED.carry_over_policy,
    burst_limit = EXCLUDED.burst_limit,
    updated_at = now();

  -- 4. Save new snapshot (Rollback version)
  INSERT INTO feature_limits_versions (published_by, description, limits_snapshot)
  VALUES (p_published_by, 'Rollback to: ' || COALESCE(v_description, p_version_id::TEXT), v_snapshot);

  -- 5. Audit log
  INSERT INTO premium_audit_logs (user_id, action_type, ip_address, new_value)
  VALUES (p_published_by, 'LIMITS_ROLLED_BACK', p_ip, v_snapshot);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
