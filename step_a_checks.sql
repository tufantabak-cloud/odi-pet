-- 1. Test pet kontrolü
SELECT
  sub_type,
  extra_data->>'vaccine_code' AS kod,
  extra_data->>'dose_number'  AS doz,
  scheduled_at::date          AS tarih,
  COUNT(*) AS tekrar
FROM plans
WHERE pet_id  = '1899a1ab-02d9-4074-977f-9bcdf90b4981'
  AND category = 'asi'
  AND status   = 'active'
GROUP BY sub_type, extra_data->>'vaccine_code',
         extra_data->>'dose_number', scheduled_at::date
HAVING COUNT(*) > 1
ORDER BY tekrar DESC;

-- 2. Global sistem kontrolü (pet_id dahil)
SELECT
  pet_id,
  extra_data->>'vaccine_code' AS kod,
  extra_data->>'dose_number'  AS doz,
  scheduled_at::date          AS tarih,
  COUNT(*) AS tekrar
FROM plans
WHERE category = 'asi'
  AND status   = 'active'
GROUP BY
  pet_id,
  extra_data->>'vaccine_code',
  extra_data->>'dose_number',
  scheduled_at::date
HAVING COUNT(*) > 1
ORDER BY tekrar DESC;
