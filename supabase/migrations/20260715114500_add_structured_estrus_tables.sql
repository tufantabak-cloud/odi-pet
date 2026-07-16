-- 1. Günlük Gözlem Tablosu
CREATE TABLE public.pet_estrus_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.pet_estrus_cycles(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    symptom_code TEXT NOT NULL,
    severity SMALLINT NOT NULL,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'owner_observation',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(cycle_id, observation_date, symptom_code),
    CHECK (severity BETWEEN 1 AND 3),
    CHECK (source IN ('owner_observation', 'veterinary_observation'))
);

-- 2. Üreme Testleri Tablosu
CREATE TABLE public.pet_reproductive_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.pet_estrus_cycles(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL,
    sampled_at TIMESTAMPTZ NOT NULL,
    progesterone_value NUMERIC(10,3),
    progesterone_unit TEXT,
    cytology_superficial_percent NUMERIC(5,2),
    cytology_result TEXT,
    veterinarian_name TEXT,
    clinic_name TEXT,
    document_storage_path TEXT,
    verification_status TEXT NOT NULL DEFAULT 'unverified',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CHECK (test_type IN ('progesterone', 'vaginal_cytology')),
    CHECK (verification_status IN ('unverified', 'document_attached', 'verified', 'rejected')),
    CHECK (
        (test_type = 'progesterone' AND progesterone_value IS NOT NULL AND progesterone_unit IS NOT NULL AND progesterone_value >= 0 AND progesterone_unit IN ('ng/mL', 'nmol/L')) OR
        (test_type != 'progesterone' AND progesterone_value IS NULL AND progesterone_unit IS NULL)
    ),
    CHECK (
        (test_type = 'vaginal_cytology' AND (cytology_result IS NOT NULL OR cytology_superficial_percent IS NOT NULL) AND (cytology_superficial_percent IS NULL OR (cytology_superficial_percent >= 0 AND cytology_superficial_percent <= 100))) OR
        (test_type != 'vaginal_cytology' AND cytology_result IS NULL AND cytology_superficial_percent IS NULL)
    )
);

-- RLS (Row Level Security)
ALTER TABLE public.pet_estrus_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_reproductive_tests ENABLE ROW LEVEL SECURITY;

-- Sahipler petlerinin gözlemlerini ve testlerini okuyabilir
CREATE POLICY "Owners can view their pet's observations"
ON public.pet_estrus_observations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.pet_owners
        WHERE pet_owners.pet_id = pet_estrus_observations.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
);

CREATE POLICY "Owners can view their pet's tests"
ON public.pet_reproductive_tests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.pet_owners
        WHERE pet_owners.pet_id = pet_reproductive_tests.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
);
