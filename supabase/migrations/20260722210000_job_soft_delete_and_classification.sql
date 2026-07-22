-- Migration: Soft Delete and Classification Enhancements for Content Generation Jobs & Monitored Sources
-- File: 20260722210000_job_soft_delete_and_classification.sql

-- 1. content_generation_jobs tablosuna soft delete ve sınıflandırma alanları ekleme
ALTER TABLE public.content_generation_jobs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.content_generation_jobs ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.content_generation_jobs ADD COLUMN IF NOT EXISTS delete_reason text;
ALTER TABLE public.content_generation_jobs ADD COLUMN IF NOT EXISTS classification_status text DEFAULT 'classified' CHECK (classification_status IN ('classified', 'needs_admin_classification'));
ALTER TABLE public.content_generation_jobs ADD COLUMN IF NOT EXISTS required_source_count integer DEFAULT 1;

-- 2. monitored_sources tablosuna soft delete alanları ekleme
ALTER TABLE public.monitored_sources ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.monitored_sources ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.monitored_sources ADD COLUMN IF NOT EXISTS delete_reason text;

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_content_jobs_deleted ON public.content_generation_jobs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_monitored_sources_deleted ON public.monitored_sources(deleted_at) WHERE deleted_at IS NULL;

-- 3. check_job_article_type kısıtını güncelleme (yeni işlerin de aktarılmasına izin ver)
ALTER TABLE public.content_generation_jobs DROP CONSTRAINT IF EXISTS check_job_article_type;
ALTER TABLE public.content_generation_jobs ADD CONSTRAINT check_job_article_type
  CHECK (
    (job_type IN ('new_content', 'update_content'))
  );

NOTIFY pgrst, 'reload schema';
