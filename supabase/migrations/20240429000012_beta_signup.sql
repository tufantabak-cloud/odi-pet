-- Migration: beta sign‑ups collection
CREATE TABLE IF NOT EXISTS public.beta_signups (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        NOT NULL UNIQUE,
  name       TEXT,
  segment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.beta_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beta signups readable by admin" ON public.beta_signups
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "beta signups insertable by anyone" ON public.beta_signups
  FOR INSERT WITH CHECK (true);
