-- Migration: Add target_weight_kg to pets table
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(5,2);

-- Grant column update permissions to authenticated users for RLS
GRANT UPDATE (target_weight_kg) ON TABLE public.pets TO authenticated;
