-- =============================================
-- SPRINT 4 v2: Revenue Models, B2B Ecosystem & Stripe
-- =============================================

-- 1. ENUM Genişletmesi (user_role eğer kullanılıyorsa)
-- Güvenlik amaçlı bloğu PL/pgSQL içine alıyoruz.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hotel_admin';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hotel_staff';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'groomer_admin';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'groomer_staff';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sitter';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'trainer';
  END IF;
END $$;

-- 2. SUBSCRIPTION PLANS (Admin'den yönetilecek tüm planlar)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text UNIQUE NOT NULL,
  plan_name text NOT NULL,
  plan_type text NOT NULL, -- 'consumer' | 'business'
  business_type text,      -- NULL for consumer, else: 'clinic'|'hotel'|'groomer'|'sitter'|'trainer'
  price_monthly decimal(10,2),
  price_yearly decimal(10,2),
  currency text DEFAULT 'TRY',
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  is_active boolean DEFAULT true,
  -- AI limitleri
  ai_vet_daily_limit integer DEFAULT 3,
  scanner_daily_limit integer DEFAULT 2,
  pdf_report_monthly_limit integer DEFAULT 0,
  nutrition_analysis_limit integer DEFAULT 0,
  max_pets integer DEFAULT 1,
  -- İşletme limitleri
  max_staff integer,
  max_patients integer,
  features jsonb DEFAULT '[]',
  commission_rate decimal(4,2) DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 3. ONBOARDING LIMITS (İlk 30 gün kancası)
CREATE TABLE IF NOT EXISTS public.onboarding_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  onboarding_days integer DEFAULT 30,
  onboarding_daily_limit integer,
  onboarding_total_limit integer,
  description text,
  updated_at timestamp DEFAULT now()
);

-- SEED DATA: Onboarding ve Planlar
INSERT INTO public.subscription_plans
  (plan_key, plan_name, plan_type, price_monthly, price_yearly,
   ai_vet_daily_limit, scanner_daily_limit, pdf_report_monthly_limit,
   nutrition_analysis_limit, max_pets)
VALUES
  ('free',         'Ücretsiz',      'consumer', 0,    0,    3,  2,  0,  0,  1),
  ('pro',          'Pro',           'consumer', 99,   890,  50, 20, 999,999, 999),
  ('ai_plus',      'AI Plus',       'consumer', 79,   NULL, 200,20, 999,999, 999),
  ('clinic_basic', 'Klinik Basic',  'business', 499,  NULL, 10, 5,  10, 5,  NULL),
  ('clinic_pro',   'Klinik Pro',    'business', 999,  NULL, 50, 20, 999,999, NULL),
  ('hotel_basic',  'Otel Basic',    'business', 299,  NULL, 10, 5,  5,  5,  NULL),
  ('hotel_pro',    'Otel Pro',      'business', 599,  NULL, 20, 10, 20, 10, NULL),
  ('groomer',      'Kuaför',        'business', 199,  NULL, 10, 5,  5,  5,  NULL),
  ('sitter',       'Bakıcı',        'business', 149,  NULL, 5,  3,  3,  3,  NULL),
  ('trainer',      'Eğitmen',       'business', 199,  NULL, 10, 5,  5,  5,  NULL)
ON CONFLICT (plan_key) DO NOTHING;

INSERT INTO public.onboarding_limits
  (feature_key, onboarding_days, onboarding_daily_limit, onboarding_total_limit)
VALUES
  ('ai_vet',            30, 10,   NULL),
  ('scanner',           30, 5,    NULL),
  ('pdf_report',        30, NULL, 2),
  ('nutrition_analysis',30, NULL, 3)
ON CONFLICT (feature_key) DO NOTHING;

-- 4. B2B İşletme Profilleri
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_type text NOT NULL,
  business_name text NOT NULL,
  description text,
  address text,
  city text,
  district text,
  lat decimal,
  lng decimal,
  phone text,
  website text,
  avatar_url text,
  cover_url text,
  working_hours jsonb,
  services jsonb DEFAULT '[]',
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  rating decimal DEFAULT 0,
  review_count integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- 5. user_subscriptions Eklemeleri (Stripe & AI Credits)
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamp,
  ADD COLUMN IF NOT EXISTS ai_credits integer DEFAULT 0;

-- 6. Marketplace & Referral
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL, 
  species text[],         
  description text,
  image_url text,
  price decimal(10,2) NOT NULL,
  stock_count integer DEFAULT 0,
  affiliate_url text,
  commission_rate decimal(4,2) DEFAULT 0.10,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.marketplace_products(id),
  source text,
  clicked_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_species ON public.marketplace_products USING GIN (species);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace_products (category, is_active);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code text UNIQUE NOT NULL,
  source text,
  status text DEFAULT 'pending', 
  reward_type text,   
  created_at timestamp DEFAULT now(),
  completed_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);

-- RLS Policies
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Read rules
CREATE POLICY "Public plans read" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Public onboarding_limits read" ON public.onboarding_limits FOR SELECT USING (true);
CREATE POLICY "Public business_profiles read" ON public.business_profiles FOR SELECT USING (is_active = true);
CREATE POLICY "Public marketplace_products read" ON public.marketplace_products FOR SELECT USING (is_active = true);

-- User data rules
CREATE POLICY "Users can manage their business profile" ON public.business_profiles FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can track their clicks" ON public.marketplace_clicks FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can manage referrals" ON public.referrals FOR ALL USING (referrer_id = auth.uid() OR referred_id = auth.uid());
