-- Migration for Sprint 1: Rate Limiting & Data Quality & Notification Prefs

-- 1. ai_usage_logs tablosu
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature text NOT NULL, -- 'scan_document' | 'ai_vet'
  used_at timestamp DEFAULT now(),
  date date DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_profile_date 
  ON public.ai_usage_logs (profile_id, feature, date);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanıcı kendi loglarını görür" 
  ON public.ai_usage_logs FOR SELECT 
  USING (auth.uid() = profile_id);

-- 2. data_quality_configs tablosu
CREATE TABLE IF NOT EXISTS public.data_quality_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species text NOT NULL,           -- 'Kedi' | 'Köpek'
  field_name text NOT NULL,        -- 'microchip_no' | 'weight' | 'breed' vb.
  is_required boolean DEFAULT false,
  fill_rate_threshold float DEFAULT 0.7,
  smart_card_message text,
  created_at timestamp DEFAULT now()
);

INSERT INTO public.data_quality_configs 
  (species, field_name, is_required, fill_rate_threshold, smart_card_message)
VALUES
  ('Kedi',  'weight',       true,  0.9, 'Kilo bilgisi eksik — beslenme önerileri için girin'),
  ('Kedi',  'microchip_no', false, 0.5, 'Mikroçip numaranızı ekleyin, kayıp durumunda bulunma ihtimali artar'),
  ('Köpek', 'weight',       true,  0.9, 'Kilo bilgisi eksik — ilaç dozu hesabı için girin'),
  ('Köpek', 'microchip_no', false, 0.5, 'Mikroçip numaranızı ekleyin'),
  ('Köpek', 'breed',        false, 0.7, 'Irkını ekleyin — size özel sağlık tavsiyeleri alın')
ON CONFLICT DO NOTHING;

-- 3. pets.data_quality_score
ALTER TABLE public.pets 
  ADD COLUMN IF NOT EXISTS data_quality_score integer DEFAULT 0;

-- 4. user_subscriptions.notification_prefs
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{
    "vaccine_reminders": true,
    "weight_alerts": true,
    "data_quality_tips": true,
    "churn_risk_offers": false,
    "marketing": false
  }'::jsonb;
