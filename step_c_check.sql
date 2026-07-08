SELECT
  id,
  sub_type,
  scheduled_at::date          AS tarih,
  extra_data->>'vaccine_code' AS kod,
  extra_data->>'dose_number'  AS doz,
  extra_data->>'migrated_from' AS kaynak,
  extra_data->>'old_record_id' AS eski_id,
  created_at::date            AS olusturulma
FROM plans
WHERE pet_id  = '1899a1ab-02d9-4074-977f-9bcdf90b4981'
  AND category = 'asi'
  AND status   = 'active'
ORDER BY extra_data->>'vaccine_code', (extra_data->>'dose_number')::int, scheduled_at::date;
