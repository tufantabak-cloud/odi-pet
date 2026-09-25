-- Migration: Add is_archived and archived_at columns to public.pets
-- Aligns database schema with OPOS Cilt 5 Health Data Archival Only rule

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pets_owner_archived ON public.pets(owner_id, is_archived);
