-- Migration: Add is_archived and archived_at columns to public.weight_logs
-- OPOS Vol 5 & 6 Medical Data Archival Standard compliance

ALTER TABLE public.weight_logs
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_weight_logs_pet_archived ON public.weight_logs(pet_id, is_archived);
