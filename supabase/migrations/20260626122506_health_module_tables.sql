-- Ensure pet-documents storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-documents',
  'pet-documents', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS politikaları
DROP POLICY IF EXISTS "Users can upload pet documents" ON storage.objects; CREATE POLICY "Users can upload pet documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pet-documents' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can read own pet documents" ON storage.objects; CREATE POLICY "Users can read own pet documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pet-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own pet documents" ON storage.objects; CREATE POLICY "Users can delete own pet documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pet-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create health_treatments table
CREATE TABLE IF NOT EXISTS public.health_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create health_measurements table
CREATE TABLE IF NOT EXISTS public.health_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  measurement_type text NOT NULL,
  value numeric NOT NULL,
  unit text,
  measured_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create health_records table
CREATE TABLE IF NOT EXISTS public.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL, -- Requirement: type must be TEXT (no enums)
  document_path text,
  date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_treatments
CREATE POLICY "Users can view health_treatments of their pets"
ON public.health_treatments FOR SELECT
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert health_treatments for their pets"
ON public.health_treatments FOR INSERT
WITH CHECK (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update health_treatments of their pets"
ON public.health_treatments FOR UPDATE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete health_treatments of their pets"
ON public.health_treatments FOR DELETE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);


-- RLS Policies for health_measurements
CREATE POLICY "Users can view health_measurements of their pets"
ON public.health_measurements FOR SELECT
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert health_measurements for their pets"
ON public.health_measurements FOR INSERT
WITH CHECK (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update health_measurements of their pets"
ON public.health_measurements FOR UPDATE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete health_measurements of their pets"
ON public.health_measurements FOR DELETE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);


-- RLS Policies for health_records
CREATE POLICY "Users can view health_records of their pets"
ON public.health_records FOR SELECT
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert health_records for their pets"
ON public.health_records FOR INSERT
WITH CHECK (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update health_records of their pets"
ON public.health_records FOR UPDATE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete health_records of their pets"
ON public.health_records FOR DELETE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);
