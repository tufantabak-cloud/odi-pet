BEGIN;

DELETE FROM vaccine_records_v2
WHERE status = 'scheduled'
  AND administered_at IS NULL;

-- Kaç satır silindi?
SELECT COUNT(*) AS kalan_hatali
FROM vaccine_records_v2
WHERE status = 'scheduled'
  AND administered_at IS NULL;

COMMIT;
