-- =============================================
-- MONETIZATION & NUTRITION MIGRATION
-- =============================================

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'ai_plus'
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_profile_subscription UNIQUE (profile_id)
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Owners can view own subscription" ON public.user_subscriptions
  FOR SELECT USING (profile_id = auth.uid());

-- 2. NUTRITION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    food_logged BOOLEAN DEFAULT false,
    water_logged BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pet_nutrition_date UNIQUE (pet_id, date)
);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Owners manage nutrition logs" ON public.nutrition_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = nutrition_logs.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- Function to safely insert default subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (profile_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create free subscription on profile creation
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
