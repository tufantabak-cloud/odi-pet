CREATE TABLE IF NOT EXISTS public.care_plans (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid not null references public.pets(id) on delete cascade,
  plan_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(pet_id)
);

ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view care_plans for their pets" ON public.care_plans
  FOR SELECT USING (
    pet_id IN (
      SELECT id FROM public.pets WHERE owner_id = auth.uid() OR id IN (
        SELECT pet_id FROM public.pet_family_members WHERE member_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert care_plans for their pets" ON public.care_plans
  FOR INSERT WITH CHECK (
    pet_id IN (
      SELECT id FROM public.pets WHERE owner_id = auth.uid() OR id IN (
        SELECT pet_id FROM public.pet_family_members WHERE member_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update care_plans for their pets" ON public.care_plans
  FOR UPDATE USING (
    pet_id IN (
      SELECT id FROM public.pets WHERE owner_id = auth.uid() OR id IN (
        SELECT pet_id FROM public.pet_family_members WHERE member_id = auth.uid()
      )
    )
  );
