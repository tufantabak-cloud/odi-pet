-- Ensure growth_records table exists
CREATE TABLE IF NOT EXISTS public.growth_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5,2),
    height_cm NUMERIC(5,2),
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.growth_records ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'growth_records' AND policyname = 'Users can view their own pets growth records'
    ) THEN
        CREATE POLICY "Users can view their own pets growth records"
            ON public.growth_records FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.pets
                    WHERE pets.id = growth_records.pet_id
                    AND pets.owner_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'growth_records' AND policyname = 'Users can insert growth records for their own pets'
    ) THEN
        CREATE POLICY "Users can insert growth records for their own pets"
            ON public.growth_records FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.pets
                    WHERE pets.id = growth_records.pet_id
                    AND pets.owner_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'growth_records' AND policyname = 'Users can update growth records for their own pets'
    ) THEN
        CREATE POLICY "Users can update growth records for their own pets"
            ON public.growth_records FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.pets
                    WHERE pets.id = growth_records.pet_id
                    AND pets.owner_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'growth_records' AND policyname = 'Users can delete growth records for their own pets'
    ) THEN
        CREATE POLICY "Users can delete growth records for their own pets"
            ON public.growth_records FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM public.pets
                    WHERE pets.id = growth_records.pet_id
                    AND pets.owner_id = auth.uid()
                )
            );
    END IF;
END $$;
