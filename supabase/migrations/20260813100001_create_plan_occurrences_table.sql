-- Migration: 20260813100001_create_plan_occurrences_table
-- Description: Creates the plan_occurrences table to separate immutable occurrence history from mutable plan definitions.

CREATE TABLE IF NOT EXISTS public.plan_occurrences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  
  status TEXT NOT NULL CHECK (status IN ('open', 'completed', 'cancelled', 'skipped')),
  
  -- Reference to the canonical record that completed this occurrence
  record_id UUID, 
  -- record_table lets us know which canonical table holds the record_id (e.g., 'meal_consumption', 'vaccine_records')
  record_table TEXT, 
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a specific occurrence time for a plan is unique to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_occurrences_plan_time 
ON public.plan_occurrences(plan_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_plan_occurrences_pet_id ON public.plan_occurrences(pet_id);
CREATE INDEX IF NOT EXISTS idx_plan_occurrences_status ON public.plan_occurrences(status);

-- RLS
ALTER TABLE public.plan_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage plan_occurrences" ON public.plan_occurrences FOR ALL USING (
  auth.uid() IN (
    SELECT owner_id FROM public.pets WHERE id = plan_occurrences.pet_id
    UNION
    SELECT profile_id FROM public.pet_owners WHERE pet_id = plan_occurrences.pet_id
  )
);

-- Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION public.set_plan_occurrences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_occurrences_updated_at_trigger
BEFORE UPDATE ON public.plan_occurrences
FOR EACH ROW EXECUTE FUNCTION public.set_plan_occurrences_updated_at();
