-- =============================================
-- SPRINT 4: Marketplace, Referrals & Stripe
-- =============================================

-- 1. Marketplace Tabloları
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL, -- 'food' | 'treat' | 'accessory' | 'medicine' | 'toy'
  species text[],         -- ['Kedi'] | ['Köpek'] | ['Kedi','Köpek']
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
  source text, -- 'recommendation' | 'search' | 'banner'
  clicked_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_species ON public.marketplace_products USING GIN (species);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace_products (category, is_active);

-- 2. Referral Tabloları
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code text UNIQUE NOT NULL,
  source text, -- 'share_link' | 'sos_page' | 'qr_code'
  status text DEFAULT 'pending', -- 'pending' | 'completed' | 'rewarded'
  reward_type text,   -- 'free_month' | 'ai_credits' | 'marketplace_discount'
  created_at timestamp DEFAULT now(),
  completed_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id, status);

-- 3. Abonelik ve AI Kredi Güncellemeleri
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamp,
  ADD COLUMN IF NOT EXISTS ai_credits integer DEFAULT 0;

-- 4. RLS Policies
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active marketplace products" ON public.marketplace_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can insert marketplace clicks" ON public.marketplace_clicks
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can view their referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "System can manage referrals" ON public.referrals
  FOR ALL USING (true); -- Güvenli ortamda service_role kullanılarak işlem yapılacağı için MVP seviyesi.
