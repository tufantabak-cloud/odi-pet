-- Migration: Content Freshness & Revision Lifecycle Management
-- File: 20260722120000_content_freshness_and_revisions.sql

-- 1. Articles tablosuna güncellik ve versiyon kolonları ekleme
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS freshness_type text DEFAULT 'evergreen',
  ADD COLUMN IF NOT EXISTS review_interval_days integer DEFAULT 365,
  ADD COLUMN IF NOT EXISTS content_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS latest_change_summary text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- CHECK Constraint: freshness_type
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_freshness_type_check;
ALTER TABLE articles ADD CONSTRAINT articles_freshness_type_check
  CHECK (freshness_type IN ('evergreen', 'seasonal', 'medical', 'product_regulatory'));

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_articles_next_review_at ON articles(next_review_at);
CREATE INDEX IF NOT EXISTS idx_articles_archived_at ON articles(archived_at);
CREATE INDEX IF NOT EXISTS idx_articles_freshness_type ON articles(freshness_type);

-- 2. Article Revisions (Sürüm Geçmişi) Tablosu
CREATE TABLE IF NOT EXISTS article_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content_snapshot jsonb NOT NULL,
  change_summary text,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  UNIQUE(article_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_article_revisions_article_id ON article_revisions(article_id);

-- 3. RLS Politikaları
ALTER TABLE article_revisions ENABLE ROW LEVEL SECURITY;

-- Admin and Founder full access to article_revisions
DROP POLICY IF EXISTS "Admin and founder full access to article_revisions" ON article_revisions;
CREATE POLICY "Admin and founder full access to article_revisions" ON article_revisions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );
