-- Migration: 20260813100000_create_missing_canonical_records
-- Description: Adds canonical record tables for missing domains (meals, care, activity) adhering to the OPOS v2.0 Shared Metadata Contract.

-- 1. meal_consumption
CREATE TABLE IF NOT EXISTS public.meal_consumption (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  -- Canonical Metadata Contract
  domain_code TEXT NOT NULL DEFAULT 'nutrition',
  subcategory_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_id UUID, -- Will reference plan_occurrences later
  source TEXT NOT NULL CHECK (source IN ('manual', 'ocr', 'inferred', 'vet', 'device')),
  verification TEXT NOT NULL CHECK (verification IN ('self_reported', 'ocr_extracted', 'vet_confirmed', 'device_measured')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tombstoned_at TIMESTAMPTZ,
  -- Domain Specific Payload
  grams NUMERIC CHECK (grams > 0),
  food_assignment_id UUID REFERENCES public.pet_food_assignments(id) ON DELETE SET NULL,
  notes TEXT
);

-- 2. care_logs
CREATE TABLE IF NOT EXISTS public.care_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  -- Canonical Metadata Contract
  domain_code TEXT NOT NULL DEFAULT 'care',
  subcategory_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_id UUID,
  source TEXT NOT NULL CHECK (source IN ('manual', 'ocr', 'inferred', 'vet', 'device')),
  verification TEXT NOT NULL CHECK (verification IN ('self_reported', 'ocr_extracted', 'vet_confirmed', 'device_measured')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tombstoned_at TIMESTAMPTZ,
  -- Domain Specific Payload
  care_type TEXT NOT NULL,
  notes TEXT
);

-- 3. activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  -- Canonical Metadata Contract
  domain_code TEXT NOT NULL DEFAULT 'activity',
  subcategory_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_id UUID,
  source TEXT NOT NULL CHECK (source IN ('manual', 'ocr', 'inferred', 'vet', 'device')),
  verification TEXT NOT NULL CHECK (verification IN ('self_reported', 'ocr_extracted', 'vet_confirmed', 'device_measured')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tombstoned_at TIMESTAMPTZ,
  -- Domain Specific Payload
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  activity_type TEXT NOT NULL,
  distance_meters NUMERIC,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_consumption_pet_id ON public.meal_consumption(pet_id);
CREATE INDEX IF NOT EXISTS idx_care_logs_pet_id ON public.care_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_pet_id ON public.activity_logs(pet_id);

-- RLS
ALTER TABLE public.meal_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for meal_consumption
CREATE POLICY "Owners manage meal_consumption" ON public.meal_consumption FOR ALL USING (
  auth.uid() IN (
    SELECT owner_id FROM public.pets WHERE id = meal_consumption.pet_id
    UNION
    SELECT profile_id FROM public.pet_owners WHERE pet_id = meal_consumption.pet_id
  )
);

-- Policies for care_logs
CREATE POLICY "Owners manage care_logs" ON public.care_logs FOR ALL USING (
  auth.uid() IN (
    SELECT owner_id FROM public.pets WHERE id = care_logs.pet_id
    UNION
    SELECT profile_id FROM public.pet_owners WHERE pet_id = care_logs.pet_id
  )
);

-- Policies for activity_logs
CREATE POLICY "Owners manage activity_logs" ON public.activity_logs FOR ALL USING (
  auth.uid() IN (
    SELECT owner_id FROM public.pets WHERE id = activity_logs.pet_id
    UNION
    SELECT profile_id FROM public.pet_owners WHERE pet_id = activity_logs.pet_id
  )
);
