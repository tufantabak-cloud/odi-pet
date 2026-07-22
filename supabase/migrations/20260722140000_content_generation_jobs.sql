-- Migration: Guarded Content Generation Jobs & Job Sources
-- File: 20260722140000_content_generation_jobs.sql

-- 1. Content Generation Jobs Tablosu
CREATE TABLE IF NOT EXISTS content_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL CHECK (job_type IN ('new_content', 'update_content')),
  article_id uuid REFERENCES articles(id) ON DELETE SET NULL,
  topic text NOT NULL,
  generation_status text NOT NULL DEFAULT 'queued' 
    CHECK (generation_status IN (
      'queued', 'research_required', 'source_review_required', 'ready_for_generation', 
      'generating', 'draft_ready', 'admin_review_required', 'vet_review_required', 
      'approved_for_import', 'imported', 'rejected', 'failed'
    )),
  generated_draft jsonb,
  proposed_targeting jsonb,
  change_summary text,
  generated_by text DEFAULT 'ai_content_agent',
  model_name text DEFAULT 'gemini-1.5-flash',
  prompt_version integer DEFAULT 1,
  generation_attempts integer DEFAULT 0,
  last_error text,
  generated_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Checks: job_type & article_id
ALTER TABLE content_generation_jobs DROP CONSTRAINT IF EXISTS check_job_article_type;
ALTER TABLE content_generation_jobs ADD CONSTRAINT check_job_article_type
  CHECK (
    (job_type = 'update_content' AND article_id IS NOT NULL) OR
    (job_type = 'new_content' AND article_id IS NULL)
  );

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_content_jobs_status ON content_generation_jobs(generation_status);
CREATE INDEX IF NOT EXISTS idx_content_jobs_article_id ON content_generation_jobs(article_id);

-- 2. Content Generation Job Sources Tablosu
CREATE TABLE IF NOT EXISTS content_generation_job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  source_title text NOT NULL,
  source_url text,
  publisher text,
  source_type text NOT NULL DEFAULT 'scientific',
  published_at timestamptz,
  checked_at timestamptz DEFAULT now(),
  verification_status text NOT NULL DEFAULT 'proposed'
    CHECK (verification_status IN ('proposed', 'verified', 'rejected')),
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  source_excerpt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_job_sources_job_id ON content_generation_job_sources(job_id);
CREATE INDEX IF NOT EXISTS idx_job_sources_verification ON content_generation_job_sources(job_id, verification_status);

-- 3. RLS Politikaları
ALTER TABLE content_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generation_job_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and founder access to content_generation_jobs" ON content_generation_jobs;
CREATE POLICY "Admin and founder access to content_generation_jobs" ON content_generation_jobs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );

DROP POLICY IF EXISTS "Admin and founder access to content_generation_job_sources" ON content_generation_job_sources;
CREATE POLICY "Admin and founder access to content_generation_job_sources" ON content_generation_job_sources
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );
