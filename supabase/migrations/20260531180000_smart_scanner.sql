-- Create the staging table for smart scanner results
CREATE TABLE public.smart_scanner_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES public.pets(id) NOT NULL,
    record_type TEXT CHECK (record_type IN ('vaccine_card', 'pet_tag', 'medicine_packaging', 'food_packaging', 'unclassified')),
    extracted_text TEXT,
    scan_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    original_image_url TEXT,
    status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for quick lookups
CREATE INDEX idx_smart_scanner_records_pet_id ON public.smart_scanner_records (pet_id);
CREATE INDEX idx_smart_scanner_records_status ON public.smart_scanner_records (status);

-- Enable RLS
ALTER TABLE public.smart_scanner_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users on their own pet records"
ON public.smart_scanner_records
FOR SELECT
TO authenticated
USING (
    auth.uid() = (SELECT owner_id FROM public.pets WHERE id = pet_id)
);

CREATE POLICY "Enable insert for authenticated users on their own pets"
ON public.smart_scanner_records
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.pets WHERE id = pet_id)
);

CREATE POLICY "Enable update for authenticated users on their own pets"
ON public.smart_scanner_records
FOR UPDATE
TO authenticated
USING (
    auth.uid() = (SELECT owner_id FROM public.pets WHERE id = pet_id)
)
WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.pets WHERE id = pet_id)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_smart_scanner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smart_scanner_records_updated_at
BEFORE UPDATE ON public.smart_scanner_records
FOR EACH ROW
EXECUTE FUNCTION public.update_smart_scanner_updated_at();
