-- Başvuru tablosu
CREATE TABLE IF NOT EXISTS public.breeding_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL 
    REFERENCES public.breeding_listings(id) ON DELETE CASCADE,
  applicant_pet_id UUID NOT NULL 
    REFERENCES public.pets(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  message TEXT,
  kvkk_consent BOOLEAN NOT NULL DEFAULT false,
  kvkk_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(listing_id, applicant_pet_id)
);

ALTER TABLE public.breeding_applications 
  ENABLE ROW LEVEL SECURITY;

-- İlan sahibi kendi ilanına gelen başvuruları görebilir
CREATE POLICY "Owner can view applications to their listings"
  ON public.breeding_applications FOR SELECT
  USING (auth.uid() = owner_user_id);

-- Başvuran kendi başvurularını görebilir  
CREATE POLICY "Applicant can view own applications"
  ON public.breeding_applications FOR SELECT
  USING (auth.uid() = applicant_user_id);

-- Herkes başvuru yapabilir
CREATE POLICY "Anyone can create application"
  ON public.breeding_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_user_id);

-- Sadece ilan sahibi status güncelleyebilir
CREATE POLICY "Owner can update application status"
  ON public.breeding_applications FOR UPDATE
  USING (auth.uid() = owner_user_id);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_breeding_applications_listing 
  ON public.breeding_applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_breeding_applications_applicant 
  ON public.breeding_applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_breeding_applications_owner 
  ON public.breeding_applications(owner_user_id);
