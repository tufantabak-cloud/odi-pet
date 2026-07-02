-- Add latitude and longitude columns to lost_reports table
ALTER TABLE public.lost_reports
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;
