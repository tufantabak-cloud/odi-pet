-- Migration: Monitored Sources & Discovered External Content (Phase 1)
-- File: 20260722200000_monitored_sources_and_discovered_content.sql

-- 1. monitored_sources Tablosu
CREATE TABLE IF NOT EXISTS public.monitored_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('instagram_post', 'web_page', 'rss', 'atom', 'instagram_account')),
  source_name text NOT NULL,
  source_handle text,
  source_url text NOT NULL,
  species_scope text NOT NULL DEFAULT 'both' CHECK (species_scope IN ('cat', 'dog', 'both')),
  allowed_categories text[] DEFAULT '{}',
  language text NOT NULL DEFAULT 'tr',
  is_active boolean NOT NULL DEFAULT true,
  trust_level text NOT NULL DEFAULT 'medium' CHECK (trust_level IN ('high', 'medium', 'low')),
  monitoring_mode text NOT NULL DEFAULT 'manual' CHECK (monitoring_mode IN ('manual', 'rss', 'api', 'unsupported_api')),
  processing_mode text NOT NULL DEFAULT 'admin_review' CHECK (processing_mode IN ('admin_review', 'draft_only')),
  attribution_mode text NOT NULL DEFAULT 'full' CHECK (attribution_mode IN ('full', 'name_only', 'link_only', 'none')),
  media_usage_mode text NOT NULL DEFAULT 'embed_only' CHECK (media_usage_mode IN ('link_only', 'embed_only', 'permission_granted', 'owned')),
  check_frequency_hours integer DEFAULT 24,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_monitored_sources_active ON public.monitored_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_monitored_sources_type ON public.monitored_sources(source_type);

-- 2. discovered_external_contents Tablosu
CREATE TABLE IF NOT EXISTS public.discovered_external_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.monitored_sources(id) ON DELETE CASCADE,
  external_content_id text NOT NULL,
  permalink text NOT NULL,
  canonical_url text NOT NULL,
  content_hash text NOT NULL,
  title text,
  excerpt text,
  raw_caption text,
  published_at timestamptz,
  processing_status text NOT NULL DEFAULT 'discovered' 
    CHECK (processing_status IN (
      'discovered', 'ignored', 'research_required', 'researching', 
      'draft_ready', 'admin_review_required', 'rejected', 'failed'
    )),
  rejection_reason text,
  job_id uuid REFERENCES public.content_generation_jobs(id) ON DELETE SET NULL,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Unique constraints for deduplication
ALTER TABLE public.discovered_external_contents DROP CONSTRAINT IF EXISTS uq_discovered_source_ext_id;
ALTER TABLE public.discovered_external_contents ADD CONSTRAINT uq_discovered_source_ext_id UNIQUE (source_id, external_content_id);

ALTER TABLE public.discovered_external_contents DROP CONSTRAINT IF EXISTS uq_discovered_permalink;
ALTER TABLE public.discovered_external_contents ADD CONSTRAINT uq_discovered_permalink UNIQUE (permalink);

ALTER TABLE public.discovered_external_contents DROP CONSTRAINT IF EXISTS uq_discovered_content_hash;
ALTER TABLE public.discovered_external_contents ADD CONSTRAINT uq_discovered_content_hash UNIQUE (content_hash);

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_discovered_contents_source ON public.discovered_external_contents(source_id);
CREATE INDEX IF NOT EXISTS idx_discovered_contents_status ON public.discovered_external_contents(processing_status);

-- 3. STRICT RLS POLİTİKALARI (NO PUBLIC SELECT - ONLY ADMIN/FOUNDER)
ALTER TABLE public.monitored_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_external_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and founder access to monitored_sources" ON public.monitored_sources;
CREATE POLICY "Admin and founder access to monitored_sources" ON public.monitored_sources
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'founder')
    )
  );

DROP POLICY IF EXISTS "Admin and founder access to discovered_external_contents" ON public.discovered_external_contents;
CREATE POLICY "Admin and founder access to discovered_external_contents" ON public.discovered_external_contents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'founder')
    )
  );

NOTIFY pgrst, 'reload schema';
