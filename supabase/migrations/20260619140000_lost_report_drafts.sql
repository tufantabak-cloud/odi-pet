-- Create table for storing multi-step form drafts for lost reports
CREATE TABLE IF NOT EXISTS public.lost_report_drafts (
    session_id TEXT PRIMARY KEY,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE public.lost_report_drafts ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on drafts"
    ON public.lost_report_drafts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
