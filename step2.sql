BEGIN;

INSERT INTO plans (
  pet_id, user_id, category, sub_type,
  scheduled_at, status, extra_data, created_at
)
SELECT
  vr.pet_id,
  p.owner_id,
  'asi',
  vr.vaccine_name,
  vr.due_at,
  'active',
  jsonb_build_object(
    'record_type',      'vaccine_schedule',
    'vaccine_code',     vr.vaccine_code,
    'migrated_from',    'vaccine_records_v2',
    'old_record_id',    vr.id,
    'dose_number',      vr.dose_number,
    'source',           'system_generated',
    'confidence_level', 'estimated'
  ),
  vr.created_at
FROM vaccine_records_v2 vr
JOIN pets p ON p.id = vr.pet_id
WHERE vr.status = 'scheduled'
  AND vr.administered_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM plans pl
    WHERE pl.extra_data->>'old_record_id' = vr.id::text
  );

UPDATE vaccine_records_v2
SET status = 'migrated_to_plan'
WHERE status = 'scheduled'
  AND administered_at IS NULL;

COMMIT;
