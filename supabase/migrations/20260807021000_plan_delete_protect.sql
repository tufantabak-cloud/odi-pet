-- =============================================================================
-- Feature Registry - Phase 8: Plan Deletion Protection
-- Migration : 20260807021000_plan_delete_protect.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION protect_app_plans_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_active_users_count INT;
BEGIN
  SELECT COUNT(*) INTO v_active_users_count 
  FROM profiles 
  WHERE premium_tier = OLD.plan_key 
    AND premium_until > now();

  IF v_active_users_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete plan % because there are % active users subscribed to it.', OLD.plan_key, v_active_users_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_app_plans_delete ON app_plans;
CREATE TRIGGER trg_protect_app_plans_delete
BEFORE DELETE ON app_plans
FOR EACH ROW
EXECUTE FUNCTION protect_app_plans_delete();

COMMIT;
