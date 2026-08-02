-- Add province and district columns to lost_reports table for location-based filtering.
-- Existing rows remain valid as these columns are NULLABLE.

ALTER TABLE public.lost_reports
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS district text;

CREATE INDEX IF NOT EXISTS idx_lost_reports_province
  ON public.lost_reports (province);

CREATE INDEX IF NOT EXISTS idx_lost_reports_district
  ON public.lost_reports (district);
