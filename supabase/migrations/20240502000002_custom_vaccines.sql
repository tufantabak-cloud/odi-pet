-- =============================================
-- CUSTOM VACCINE TEMPLATES MIGRATION
-- =============================================

-- Add profile_id to vaccine_templates
ALTER TABLE public.vaccine_templates
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add category column
ALTER TABLE public.vaccine_templates
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'vaccine' CHECK (category IN ('vaccine', 'parasite', 'other'));

-- Drop the old unique constraint
ALTER TABLE public.vaccine_templates
  DROP CONSTRAINT IF EXISTS vaccine_templates_vaccine_code_dose_number_species_key;
DROP INDEX IF EXISTS idx_vaccine_templates_code_dose_species;

-- Create the new unique constraint that considers profile_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_vaccine_templates_code_dose_species_profile
  ON public.vaccine_templates(vaccine_code, dose_number, species, COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can read vaccine templates" ON public.vaccine_templates;
CREATE POLICY "Users can read global or their own templates" ON public.vaccine_templates
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own templates" ON public.vaccine_templates;
CREATE POLICY "Users can insert their own templates" ON public.vaccine_templates
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own templates" ON public.vaccine_templates;
CREATE POLICY "Users can update their own templates" ON public.vaccine_templates
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own templates" ON public.vaccine_templates;
CREATE POLICY "Users can delete their own templates" ON public.vaccine_templates
  FOR DELETE USING (profile_id = auth.uid());
