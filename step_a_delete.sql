BEGIN;

DELETE FROM plans
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY
          pet_id,
          extra_data->>'vaccine_code',
          extra_data->>'dose_number',
          scheduled_at::date
        ORDER BY created_at ASC
      ) AS rn
    FROM plans
    WHERE category = 'asi' AND status = 'active'
  ) ranked
  WHERE rn > 1
);

SELECT COUNT(*) AS kalan FROM plans
WHERE category = 'asi' AND status = 'active';

COMMIT;
