-- Migration: Article External Sources & Visual Article Media
-- File: 20260722150000_article_sources_and_media.sql

-- 1. article_sources tablosuna yeni sütunların eklenmesi
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS source_name text;
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS instagram_username text;
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS display_in_article boolean DEFAULT true;
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS show_source_name boolean DEFAULT true;
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS show_source_link boolean DEFAULT true;
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'proposed';
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE article_sources ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- CHECK Constraint: source_type güncellemesi
ALTER TABLE article_sources DROP CONSTRAINT IF EXISTS article_sources_type_check;
ALTER TABLE article_sources ADD CONSTRAINT article_sources_type_check
  CHECK (source_type IN (
    'pubmed',
    'scientific_article',
    'official_guideline',
    'web_page',
    'instagram_post',
    'instagram_profile',
    'manual_reference',
    'official',
    'veterinary_guideline',
    'scientific',
    'manufacturer',
    'reputable_editorial'
  ));

-- CHECK Constraint: verification_status
ALTER TABLE article_sources DROP CONSTRAINT IF EXISTS article_sources_verify_check;
ALTER TABLE article_sources ADD CONSTRAINT article_sources_verify_check
  CHECK (verification_status IN ('proposed', 'verified', 'rejected'));


-- 2. article_media tablosunun oluşturulması
CREATE TABLE IF NOT EXISTS article_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('featured_image', 'content_image', 'gallery_image')),
  storage_path text,
  external_url text,
  alt_text text NOT NULL,
  caption text,
  source_name text,
  source_url text,
  rights_status text NOT NULL CHECK (rights_status IN ('owned', 'licensed', 'permission_granted', 'public_domain', 'embed_only', 'unknown')),
  rights_note text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_article_media_article_id ON article_media(article_id);
CREATE INDEX IF NOT EXISTS idx_article_media_type ON article_media(article_id, media_type);

-- RLS Politikaları
ALTER TABLE article_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and founder full access to article_media" ON article_media;
CREATE POLICY "Admin and founder full access to article_media" ON article_media
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'founder')
    )
  );

DROP POLICY IF EXISTS "Public read access to active article_media" ON article_media;
CREATE POLICY "Public read access to active article_media" ON article_media
  FOR SELECT TO public
  USING (
    is_active = true AND rights_status != 'unknown'
  );

DROP POLICY IF EXISTS "Public read access to active display article_sources" ON article_sources;
CREATE POLICY "Public read access to active display article_sources" ON article_sources
  FOR SELECT TO public
  USING (
    is_active = true AND display_in_article = true
  );

-- Storage bucket oluşturma
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-media', 'article-media', true)
ON CONFLICT (id) DO NOTHING;
