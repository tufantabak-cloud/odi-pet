-- Fix outreach_pipeline RLS: service_role check doesn't work in browser clients.
-- Replace with auth.uid()-based policy so the founder (logged-in user) can access.

DROP POLICY IF EXISTS "service_role full access outreach" ON public.outreach_pipeline;

-- Any authenticated user can manage outreach (single-founder app, no multi-admin needed yet)
CREATE POLICY "authenticated full access outreach" ON public.outreach_pipeline
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
