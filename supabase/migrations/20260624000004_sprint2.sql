-- 1. Funnel Events Table
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  session_id text,
  event_name text NOT NULL,
  properties jsonb DEFAULT '{}',
  screen text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_funnel_profile ON public.funnel_events (profile_id, created_at DESC);
CREATE INDEX idx_funnel_event ON public.funnel_events (event_name, created_at DESC);
CREATE INDEX idx_funnel_session ON public.funnel_events (session_id);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanıcı kendi eventlerini görür"
  ON public.funnel_events FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Kullanıcı event ekleyebilir"
  ON public.funnel_events FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- 2. Profiling Prompts Table
CREATE TABLE IF NOT EXISTS public.profiling_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  trigger_context text NOT NULL,
  shown_at timestamp DEFAULT now(),
  dismissed_at timestamp,
  completed_at timestamp,
  response_value text
);

CREATE INDEX idx_profiling_pet ON public.profiling_prompts (pet_id, field_name);

-- 3. Notifications Table Updates
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS opened_at timestamp;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS open_delay_minutes integer;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_taken text;

-- 4. Session Logs Table
CREATE TABLE IF NOT EXISTS public.session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  started_at timestamp DEFAULT now(),
  ended_at timestamp,
  duration_seconds integer,
  screens_visited text[],
  actions_count integer,
  device_type text,
  entry_point text
);

CREATE INDEX idx_session_profile ON public.session_logs (profile_id, started_at DESC);

-- 5. Pets Table Updates
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS last_interaction_at timestamp;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS weekly_log_count integer DEFAULT 0;

-- 6. Pet Nutrition Logs Table
CREATE TABLE IF NOT EXISTS public.pet_nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_brand text,
  food_product text,
  food_type text,
  portion_grams integer,
  meal_time text,
  logged_at timestamp DEFAULT now()
);

CREATE INDEX idx_nutrition_pet ON public.pet_nutrition_logs (pet_id, logged_at DESC);
