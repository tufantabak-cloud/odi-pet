CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_vaccine_unique
  ON plans (
    pet_id,
    (extra_data->>'vaccine_code'),
    (extra_data->>'dose_number'),
    scheduled_at
  )
  WHERE category = 'asi' AND status = 'active';
