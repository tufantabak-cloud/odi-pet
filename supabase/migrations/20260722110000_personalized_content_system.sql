-- Migration: Personalized Content System (Articles Extension & Article Pet States)
-- Created: 2026-07-22 11:00:00 (Hardened with multi-owner RLS & Triggers)

-- 1. articles Tablosuna Eksik Temel Kolonlar ve Kişiselleştirilmiş İçerik & Veteriner Onay Kolonlarını Ekle
ALTER TABLE public.articles 
  ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS species_filter text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_breed_keys text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_breed_traits text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_life_stages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_genders text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_neutered_status text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS target_seasons text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS priority_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_medical_content boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vet_review_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS vet_reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS vet_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS references_list text[] DEFAULT '{}';

-- vet_review_status kısıtlaması (not_required | pending | approved)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_vet_review_status_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_vet_review_status_check
      CHECK (vet_review_status IN ('not_required', 'pending', 'approved'));
  END IF;
END $$;

-- target_neutered_status kısıtlaması (all | neutered | intact)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_neutered_status_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_neutered_status_check
      CHECK (target_neutered_status IN ('all', 'neutered', 'intact'));
  END IF;
END $$;

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_articles_species ON public.articles USING GIN (species_filter);
CREATE INDEX IF NOT EXISTS idx_articles_breed_keys ON public.articles USING GIN (target_breed_keys);
CREATE INDEX IF NOT EXISTS idx_articles_breed_traits ON public.articles USING GIN (target_breed_traits);
CREATE INDEX IF NOT EXISTS idx_articles_life_stages ON public.articles USING GIN (target_life_stages);
CREATE INDEX IF NOT EXISTS idx_articles_priority ON public.articles (priority_order, is_published);

-- 2. article_pet_states Tablosunu Oluştur (Kullanıcı & Pet & İçerik Durumları)
CREATE TABLE IF NOT EXISTS public.article_pet_states (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  last_shown_at timestamptz,
  last_viewed_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT article_pet_states_user_pet_article_key UNIQUE (user_id, pet_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_article_pet_states_lookup 
  ON public.article_pet_states (user_id, pet_id, article_id);

-- updated_at Trigger
CREATE OR REPLACE FUNCTION public.update_article_pet_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_article_pet_states_updated_at_trigger ON public.article_pet_states;
CREATE TRIGGER update_article_pet_states_updated_at_trigger
  BEFORE UPDATE ON public.article_pet_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_article_pet_states_updated_at();

-- 3. RLS Güvenlik Politikaları

-- articles RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Okuma Politikası:
-- Normal kullanıcılar yayınlanmış (is_published = true) ve tıbbi içerik ise approved olanları okuyabilir.
-- Admin/founder her durumda okuyabilir.
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.articles;
DROP POLICY IF EXISTS "Anyone can read eligible published articles" ON public.articles;

CREATE POLICY "Anyone can read eligible published articles" ON public.articles
  FOR SELECT
  USING (
    (
      is_published = true 
      AND (is_medical_content = false OR vet_review_status = 'approved')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'founder')
    )
  );

-- Admin/Founder Yönetim Politikası (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admin and founder can manage articles" ON public.articles;
CREATE POLICY "Admin and founder can manage articles" ON public.articles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'founder')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'founder')
    )
  );

-- article_pet_states RLS
ALTER TABLE public.article_pet_states ENABLE ROW LEVEL SECURITY;

-- Sahiplik Doğrulaması: pets.owner_id = auth.uid() VEYA pet_owners.profile_id = auth.uid()
DROP POLICY IF EXISTS "Users can view own pet article states" ON public.article_pet_states;
CREATE POLICY "Users can view own pet article states" ON public.article_pet_states
  FOR SELECT
  USING (
    auth.uid() = user_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.pets 
        WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.pet_owners
        WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own pet article states" ON public.article_pet_states;
CREATE POLICY "Users can insert own pet article states" ON public.article_pet_states
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.pets 
        WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.pet_owners
        WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own pet article states" ON public.article_pet_states;
CREATE POLICY "Users can update own pet article states" ON public.article_pet_states
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.pets 
        WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.pet_owners
        WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.pets 
        WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.pet_owners
        WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own pet article states" ON public.article_pet_states;
CREATE POLICY "Users can delete own pet article states" ON public.article_pet_states
  FOR DELETE
  USING (
    auth.uid() = user_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.pets 
        WHERE pets.id = article_pet_states.pet_id AND pets.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.pet_owners
        WHERE pet_owners.pet_id = article_pet_states.pet_id AND pet_owners.profile_id = auth.uid()
      )
    )
  );
