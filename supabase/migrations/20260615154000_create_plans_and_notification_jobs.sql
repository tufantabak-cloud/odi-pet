-- Migration: Create plans and notification_jobs tables
-- Description: Plan Wizard feature backend tables

DROP TABLE IF EXISTS public.notification_jobs CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;

-- 1. Create plans table
CREATE TABLE public.plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN (
                  'saglik','asi','parazit','bakim',
                  'beslenme','hijyen','aktivite')),
  sub_type      TEXT NOT NULL,        
  scheduled_at  TIMESTAMPTZ NOT NULL, 
  repeat_rule   TEXT,                 
  ends_at       TIMESTAMPTZ,          
  notif_before  INT DEFAULT 10,       
  notif_unit    TEXT DEFAULT 'minute' CHECK (notif_unit IN ('minute','hour','day')),
  note          TEXT,
  extra_data    JSONB DEFAULT '{}'::jsonb,   
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for plans updated_at
CREATE OR REPLACE FUNCTION public.update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_plans_updated_at_trigger ON public.plans;
CREATE TRIGGER update_plans_updated_at_trigger
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_plans_updated_at();

-- RLS for plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kullanici_kendi_planlarini_gorur"
  ON public.plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "kullanici_kendi_planlarini_olusturur"
  ON public.plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kullanici_kendi_planlarini_gunceller"
  ON public.plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "kullanici_kendi_planlarini_siler"
  ON public.plans FOR DELETE
  USING (auth.uid() = user_id);


-- 2. Create notification_jobs table
CREATE TABLE public.notification_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  fire_at     TIMESTAMPTZ NOT NULL,
  sent        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for notification_jobs updated_at
CREATE OR REPLACE FUNCTION public.update_notification_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notification_jobs_updated_at_trigger ON public.notification_jobs;
CREATE TRIGGER update_notification_jobs_updated_at_trigger
    BEFORE UPDATE ON public.notification_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_jobs_updated_at();

-- RLS for notification_jobs
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kullanici_kendi_bildirimlerini_yonetir"
  ON public.notification_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.plans 
      WHERE plans.id = notification_jobs.plan_id 
      AND plans.user_id = auth.uid()
    )
  );
