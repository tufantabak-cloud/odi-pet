-- Create health_medication_courses table
CREATE TABLE IF NOT EXISTS public.health_medication_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  medication_name text NOT NULL,
  medication_unit text,
  purpose text,
  frequency_type text,
  start_date date,
  duration_type text,
  duration_days int,
  end_date date,
  stock_enabled boolean DEFAULT false,
  stock_count numeric DEFAULT 0,
  stock_alert_threshold numeric DEFAULT 0,
  dose_per_administration numeric,
  status text DEFAULT 'active',
  main_plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create health_medication_records table
CREATE TABLE IF NOT EXISTS public.health_medication_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.health_medication_courses(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id),
  occurred_at timestamptz NOT NULL,
  occurrence_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  dose_administered numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_medication_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_medication_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_medication_courses
CREATE POLICY "Users can view health_medication_courses of their pets"
ON public.health_medication_courses FOR SELECT
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert health_medication_courses for their pets"
ON public.health_medication_courses FOR INSERT
WITH CHECK (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update health_medication_courses of their pets"
ON public.health_medication_courses FOR UPDATE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete health_medication_courses of their pets"
ON public.health_medication_courses FOR DELETE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

-- RLS Policies for health_medication_records
CREATE POLICY "Users can view health_medication_records of their pets"
ON public.health_medication_records FOR SELECT
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert health_medication_records for their pets"
ON public.health_medication_records FOR INSERT
WITH CHECK (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update health_medication_records of their pets"
ON public.health_medication_records FOR UPDATE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete health_medication_records of their pets"
ON public.health_medication_records FOR DELETE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

-- Create RPC function to consume dose
CREATE OR REPLACE FUNCTION public.consume_medication_dose(p_course_id uuid, p_dose numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.health_medication_courses
  SET stock_count = stock_count - p_dose
  WHERE id = p_course_id AND stock_enabled = true;
END;
$$;
