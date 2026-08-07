-- Migration: Add registration city, district, and agriculture directorate to pets table
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS registration_city TEXT,
  ADD COLUMN IF NOT EXISTS registration_district TEXT,
  ADD COLUMN IF NOT EXISTS agriculture_directorate TEXT;

-- Grant column update permissions to authenticated users for RLS
GRANT UPDATE (registration_city, registration_district, agriculture_directorate) ON TABLE public.pets TO authenticated;
