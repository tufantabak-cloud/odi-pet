-- Migration: add_breeding_eligibility_advisories
-- Description: Adds advisories column to separate info/warning messages from actual blocking reasons.

ALTER TABLE public.pet_breeding_eligibility
ADD COLUMN IF NOT EXISTS advisories JSONB NOT NULL DEFAULT '[]'::jsonb;
