-- Görev tanımları (tekrar eden şablonlar)
CREATE TABLE IF NOT EXISTS public.pet_care_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  frequency_days int NOT NULL,
  frequency_label text,
  created_at timestamptz DEFAULT now()
);

-- Bireysel görev olayları (her tekrar = 1 kayıt)
CREATE TABLE IF NOT EXISTS public.pet_care_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.pet_care_tasks(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_care_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pet_care_tasks
CREATE POLICY "Users can view tasks of their pets"
ON public.pet_care_tasks FOR SELECT
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert tasks for their pets"
ON public.pet_care_tasks FOR INSERT
WITH CHECK (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update tasks of their pets"
ON public.pet_care_tasks FOR UPDATE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tasks of their pets"
ON public.pet_care_tasks FOR DELETE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

-- RLS Policies for pet_care_events
CREATE POLICY "Users can view events of their pets"
ON public.pet_care_events FOR SELECT
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert events for their pets"
ON public.pet_care_events FOR INSERT
WITH CHECK (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update events of their pets"
ON public.pet_care_events FOR UPDATE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete events of their pets"
ON public.pet_care_events FOR DELETE
USING (
  pet_id IN (
    SELECT id FROM public.pets WHERE owner_id = auth.uid()
    UNION
    SELECT pet_id FROM public.pet_owners WHERE profile_id = auth.uid()
  )
);
