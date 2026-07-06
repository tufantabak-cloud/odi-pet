-- 20260705000006_backfill_plan_items.sql
INSERT INTO vaccination_plan_items (
  pet_id, antigen_code, brand_id, dose_number,
  recommended_start, recommended_end, scheduled_date,
  status, plan_origin, administration_route,
  plans_mirror_id, created_at, updated_at
)
SELECT
  p.pet_id,
  COALESCE(p.extra_data->'vaccine'->>'code', 'UNKNOWN') AS antigen_code,
  NULL AS brand_id,
  COALESCE((p.extra_data->>'dose_number')::integer, 1) AS dose_number,
  p.scheduled_at::date AS recommended_start,
  (p.scheduled_at::date + INTERVAL '14 days') AS recommended_end,
  p.scheduled_at::date AS scheduled_date,
  CASE p.status
    WHEN 'completed' THEN 'completed'
    WHEN 'skipped'   THEN 'skipped'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'upcoming'
  END AS status,
  'system_rule' AS plan_origin,
  NULL AS administration_route,
  p.id AS plans_mirror_id,
  p.created_at,
  p.updated_at
FROM plans p
WHERE
  p.category = 'asi'
  AND (p.extra_data->>'auto_generated')::boolean = true
  AND NOT EXISTS (
    SELECT 1 FROM vaccination_plan_items vpi
    WHERE vpi.plans_mirror_id = p.id
  );
