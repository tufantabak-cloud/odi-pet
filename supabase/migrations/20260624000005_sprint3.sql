-- 1. SOS Public View (Anonim Erişim İçin)
CREATE OR REPLACE VIEW public.sos_public_view AS
SELECT
  lr.id,
  lr.pet_id,
  p.name        AS pet_name,
  p.species     AS pet_species,
  p.breed       AS pet_breed,
  p.avatar_url  AS pet_photo,
  lr.last_seen_location,
  lr.last_seen_at,
  lr.status,
  lr.created_at
FROM public.lost_reports lr
JOIN public.pets p ON p.id = lr.pet_id
WHERE lr.status = 'active';

GRANT SELECT ON public.sos_public_view TO anon;

-- 2. SOS Contacts Table
CREATE TABLE IF NOT EXISTS public.lost_report_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.lost_reports(id),
  contact_name text,
  contact_phone text,
  message text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_lost_contacts_report ON public.lost_report_contacts (report_id);

-- 3. Pet Clinic Access Table
CREATE TABLE IF NOT EXISTS public.pet_clinic_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id),
  granted_at timestamp DEFAULT now(),
  revoked_at timestamp,
  UNIQUE(pet_id, clinic_id)
);

CREATE POLICY "Klinik erişim verilmiş petleri görür"
  ON public.pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_clinic_access pca
      WHERE pca.pet_id = pets.id
      AND pca.clinic_id = auth.uid()
      AND pca.revoked_at IS NULL
    )
  );

-- Not: user_subscriptions plan tiplerinin Supabase dashboard üzerinden update edileceği varsayılmıştır. ('clinic_basic', 'clinic_pro' enum value eklemesi gerekiyorsa alter type çalıştırılmalıdır, text ise gerek yok).
