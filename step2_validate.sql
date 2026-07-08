WITH t AS (
  SELECT COUNT(*) AS tasindi
  FROM plans
  WHERE extra_data->>'migrated_from' = 'vaccine_records_v2'
), p AS (
  SELECT COUNT(*) AS plans_da_olan
  FROM vaccine_records_v2 vr
  WHERE vr.status = 'scheduled'
    AND vr.administered_at IS NULL
    AND EXISTS (
      SELECT 1 FROM plans pl
      WHERE pl.extra_data->>'old_record_id' = vr.id::text
    )
)
SELECT t.tasindi, p.plans_da_olan FROM t, p;
