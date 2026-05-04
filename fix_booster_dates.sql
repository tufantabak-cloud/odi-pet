-- ============================================================
-- FIX: Gelecek booster tarihlerini gerçek yapılış tarihine göre güncelle
-- Boğmaca örneği: son yapılan 10.7.23 → bir sonraki 10.7.24 olmalı
-- ============================================================

-- Bu CTE her pet + vaccine_code için son tamamlanan aşının tarihini bulur
WITH last_completed AS (
  SELECT
    r.pet_id,
    r.vaccine_code,
    r.template_id,
    MAX(r.administered_at) AS last_administered_at
  FROM vaccine_records_v2 r
  WHERE r.status = 'completed'
    AND r.vaccine_code IS NOT NULL
    AND r.vaccine_code != 'MANUAL'
    AND r.administered_at IS NOT NULL
  GROUP BY r.pet_id, r.vaccine_code, r.template_id
),
-- Template bilgilerini çekiyoruz
template_info AS (
  SELECT id, vaccine_code, has_annual_booster, recurrence_days
  FROM vaccine_templates
),
-- Doğru yeni tarihi hesaplıyoruz
correct_dates AS (
  SELECT
    lc.pet_id,
    lc.vaccine_code,
    lc.last_administered_at,
    CASE
      WHEN ti.recurrence_days IS NOT NULL
        THEN lc.last_administered_at + (ti.recurrence_days || ' days')::interval
      ELSE
        lc.last_administered_at + interval '1 year'
    END AS correct_due_at
  FROM last_completed lc
  LEFT JOIN template_info ti
    ON ti.vaccine_code = lc.vaccine_code
  WHERE ti.has_annual_booster = true OR ti.recurrence_days IS NOT NULL
)
-- Mevcut gelecek tarihli pending kayıtları güncelliyoruz
UPDATE vaccine_records_v2 r
SET
  due_at = cd.correct_due_at,
  status = CASE
    WHEN cd.correct_due_at < NOW() THEN 'overdue'
    WHEN cd.correct_due_at < NOW() + interval '7 days' THEN 'due'
    ELSE 'scheduled'
  END
FROM correct_dates cd
WHERE r.pet_id = cd.pet_id
  AND r.vaccine_code = cd.vaccine_code
  AND r.status IN ('overdue', 'due', 'scheduled')
  AND r.due_at > cd.last_administered_at  -- sadece gelecek tarihli kayıtlar
  AND ABS(EXTRACT(EPOCH FROM (r.due_at - cd.correct_due_at)) / 86400) > 1; -- sadece 1 günden fazla fark olanlar

-- Etkilenen kayıt sayısını göster
SELECT
  r.vaccine_code,
  r.pet_id,
  r.due_at AS old_due_at,
  cd.correct_due_at AS new_due_at,
  r.status
FROM vaccine_records_v2 r
JOIN correct_dates cd
  ON r.pet_id = cd.pet_id AND r.vaccine_code = cd.vaccine_code
WHERE r.status IN ('overdue', 'due', 'scheduled')
  AND r.due_at > cd.last_administered_at
ORDER BY r.vaccine_code, r.pet_id;
