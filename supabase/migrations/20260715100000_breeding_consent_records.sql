-- Migration: breeding_consent_records
-- Description: Creates a table to securely manage versioned, revocable consent for health data sharing.

CREATE TABLE IF NOT EXISTS public.breeding_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.breeding_applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type = 'breeding_health_summary_share'),
    consent_text_version TEXT NOT NULL,
    consent_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    withdrawn_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index to ensure only one active consent per application and user
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_breeding_consent 
ON public.breeding_consent_records (application_id, user_id) 
WHERE withdrawn_at IS NULL;

-- Enable RLS
ALTER TABLE public.breeding_consent_records ENABLE ROW LEVEL SECURITY;

-- Policies

-- Users can read their own consent records
CREATE POLICY "Users can read own consent records" 
ON public.breeding_consent_records
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own consent records
CREATE POLICY "Users can insert own consent records"
ON public.breeding_consent_records
FOR INSERT
WITH CHECK (user_id = auth.uid());


