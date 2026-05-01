-- Outreach CRM: track every contact through the pipeline
CREATE TABLE IF NOT EXISTS public.outreach_pipeline (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('vet_clinic', 'creator', 'pet_owner', 'referral')),
  contact     TEXT,                    -- email, IG handle, phone
  tier        INTEGER     DEFAULT 2 CHECK (tier IN (1, 2, 3)),
  stage       TEXT        NOT NULL DEFAULT 'sourced'
                CHECK (stage IN ('sourced','contacted','replied','beta_signed','invited','activated','retained_d3','retained_d7','churned')),
  notes       TEXT,
  source      TEXT,                    -- instagram, google_maps, referral, etc.
  profile_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  contacted_at   TIMESTAMPTZ,
  replied_at     TIMESTAMPTZ,
  activated_at   TIMESTAMPTZ,
  retained_d7_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.outreach_pipeline ENABLE ROW LEVEL SECURITY;

-- Only service_role (founder) can manage pipeline
CREATE POLICY "service_role full access outreach" ON public.outreach_pipeline
  FOR ALL USING (auth.role() = 'service_role');
