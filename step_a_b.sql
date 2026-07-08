-- 1. Global duplicate var mı? (tüm system)
SELECT
  pet_id,
  extra_data->>'vaccine_code' AS kod,
  extra_data->>'dose_number'  AS doz,
  scheduled_at::date          AS tarih,
  COUNT(*) AS tekrar
FROM plans
WHERE category = 'asi' AND status = 'active'
GROUP BY pet_id, extra_data->>'vaccine_code',
         extra_data->>'dose_number', scheduled_at::date
HAVING COUNT(*) > 1
ORDER BY tekrar DESC;

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

-- Kaç satır silindi, kaç satır kaldı?
SELECT COUNT(*) AS kalan FROM plans
WHERE category = 'asi' AND status = 'active';

-- Hâlâ duplicate var mı?
SELECT COUNT(*) AS hala_duplicate FROM (
  SELECT pet_id, extra_data->>'vaccine_code', extra_data->>'dose_number', scheduled_at::date
  FROM plans
  WHERE category = 'asi' AND status = 'active'
  GROUP BY pet_id, extra_data->>'vaccine_code',
           extra_data->>'dose_number', scheduled_at::date
  HAVING COUNT(*) > 1
) x;

COMMIT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_vaccine_unique
  ON plans (
    pet_id,
    (extra_data->>'vaccine_code'),
    (extra_data->>'dose_number'),
    (scheduled_at::date)
  )
  WHERE category = 'asi' AND status = 'active';
