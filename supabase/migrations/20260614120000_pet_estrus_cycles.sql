-- Create pet_estrus_cycles table
CREATE TABLE IF NOT EXISTS public.pet_estrus_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    symptoms JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pet_estrus_cycles ENABLE ROW LEVEL SECURITY;

-- Policy for select
CREATE POLICY "Users can view their pets estrus cycles" 
ON public.pet_estrus_cycles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = pet_estrus_cycles.pet_id AND (
      pets.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.pet_members
        WHERE pet_members.pet_id = pets.id AND pet_members.profile_id = auth.uid()
      )
    )
  )
);

-- Policy for insert
CREATE POLICY "Users can insert their pets estrus cycles" 
ON public.pet_estrus_cycles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = pet_estrus_cycles.pet_id AND (
      pets.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.pet_members
        WHERE pet_members.pet_id = pets.id AND pet_members.profile_id = auth.uid()
      )
    )
  )
);

-- Policy for update
CREATE POLICY "Users can update their pets estrus cycles" 
ON public.pet_estrus_cycles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = pet_estrus_cycles.pet_id AND (
      pets.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.pet_members
        WHERE pet_members.pet_id = pets.id AND pet_members.profile_id = auth.uid()
      )
    )
  )
);

-- Policy for delete
CREATE POLICY "Users can delete their pets estrus cycles" 
ON public.pet_estrus_cycles FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = pet_estrus_cycles.pet_id AND (
      pets.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.pet_members
        WHERE pet_members.pet_id = pets.id AND pet_members.profile_id = auth.uid()
      )
    )
  )
);

-- Create trigger function for updated_at if not exists
CREATE OR REPLACE FUNCTION update_pet_estrus_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
CREATE TRIGGER handle_pet_estrus_cycles_updated_at
  BEFORE UPDATE ON public.pet_estrus_cycles
  FOR EACH ROW EXECUTE FUNCTION update_pet_estrus_cycles_updated_at();
