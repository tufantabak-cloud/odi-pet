-- Migration: content_source_verification_audits
-- Description: Stores persistent human source verification audit records for Odi.Pet content generation jobs

CREATE TABLE IF NOT EXISTS public.content_source_verification_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.content_generation_jobs(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.content_generation_job_sources(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('verified', 'rejected')),
    confirmed_title_url BOOLEAN NOT NULL DEFAULT false,
    confirmed_relevance BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for quick lookup by source_id or actor_id
CREATE INDEX IF NOT EXISTS idx_source_verification_audits_source_id ON public.content_source_verification_audits(source_id);
CREATE INDEX IF NOT EXISTS idx_source_verification_audits_actor_id ON public.content_source_verification_audits(actor_id);

-- RLS Security
ALTER TABLE public.content_source_verification_audits ENABLE ROW LEVEL SECURITY;

-- Admins and Founders can read all audit logs
CREATE POLICY "Admins and Founders can view verification audits"
    ON public.content_source_verification_audits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'founder')
        )
    );

-- Admins and Founders can insert verification audits
CREATE POLICY "Admins and Founders can insert verification audits"
    ON public.content_source_verification_audits
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'founder')
        )
    );
