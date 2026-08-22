-- Migration: Add notes column to public.weight_logs table
-- OPOS Vol 5 & 6 Schema Parity & Medical Data Archival Standard compliance

ALTER TABLE public.weight_logs
  ADD COLUMN IF NOT EXISTS notes TEXT;
