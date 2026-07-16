-- Migration: pet_breeding_eligibility
-- Description: Creates the pet_breeding_eligibility table to track the breeding suitability of pets.

CREATE TABLE IF NOT EXISTS public.pet_breeding_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL DEFAULT 'not_evaluated',
    
    minimum_age_passed BOOLEAN,
    vaccination_status TEXT NOT NULL DEFAULT 'unknown',
    parasite_status TEXT NOT NULL DEFAULT 'unknown',
    
    veterinary_clearance_status TEXT NOT NULL DEFAULT 'missing',
    veterinary_clearance_date DATE,
    clearance_expires_at TIMESTAMPTZ,
    
    infectious_disease_screening_status TEXT NOT NULL DEFAULT 'unknown',
    genetic_screening_status TEXT NOT NULL DEFAULT 'unknown',
    
    blocking_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT pet_breeding_eligibility_pet_unique UNIQUE (pet_id),
    
    CONSTRAINT check_eligibility_status CHECK (
        status IN ('not_evaluated', 'incomplete', 'vet_review_required', 'eligible', 'temporarily_ineligible', 'permanently_ineligible')
    ),
    CONSTRAINT check_vaccination_status CHECK (
        vaccination_status IN ('unknown', 'missing', 'pending', 'valid', 'expired', 'failed', 'not_required')
    ),
    CONSTRAINT check_parasite_status CHECK (
        parasite_status IN ('unknown', 'missing', 'pending', 'valid', 'expired', 'failed', 'not_required')
    ),
    CONSTRAINT check_veterinary_clearance_status CHECK (
        veterinary_clearance_status IN ('unknown', 'missing', 'pending', 'valid', 'expired', 'failed', 'not_required')
    ),
    CONSTRAINT check_infectious_disease_screening_status CHECK (
        infectious_disease_screening_status IN ('unknown', 'missing', 'pending', 'valid', 'expired', 'failed', 'not_required')
    ),
    CONSTRAINT check_genetic_screening_status CHECK (
        genetic_screening_status IN ('unknown', 'missing', 'pending', 'valid', 'expired', 'failed', 'not_required')
    )
);

-- Use the common handle_updated_at trigger if it exists. If not, this will just fail gracefully and we can create one, but most likely it exists.
-- Actually, let's create it if it doesn't exist, just to be safe.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pet_breeding_eligibility_updated_at ON public.pet_breeding_eligibility;
CREATE TRIGGER trg_pet_breeding_eligibility_updated_at
BEFORE UPDATE ON public.pet_breeding_eligibility
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.pet_breeding_eligibility ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Select: Pet owners can view their pet's eligibility
CREATE POLICY "Pet owners can view eligibility"
ON public.pet_breeding_eligibility
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pet_owners
    WHERE pet_owners.pet_id = pet_breeding_eligibility.pet_id
    AND pet_owners.profile_id = auth.uid()
  )
);

-- Insert: Pet owners can insert eligibility
CREATE POLICY "Pet owners can insert eligibility"
ON public.pet_breeding_eligibility
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pet_owners
    WHERE pet_owners.pet_id = pet_breeding_eligibility.pet_id
    AND pet_owners.profile_id = auth.uid()
  )
);

-- Update: Pet owners can update eligibility
CREATE POLICY "Pet owners can update eligibility"
ON public.pet_breeding_eligibility
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.pet_owners
    WHERE pet_owners.pet_id = pet_breeding_eligibility.pet_id
    AND pet_owners.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pet_owners
    WHERE pet_owners.pet_id = pet_breeding_eligibility.pet_id
    AND pet_owners.profile_id = auth.uid()
  )
);

-- Client DELETE is not permitted by omitting the DELETE policy.
