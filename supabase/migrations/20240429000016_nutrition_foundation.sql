-- Sprint: Nutrition Foundation v1 — Part 1/4
-- Create Supabase migration for nutrition module

-- 1. pet_nutrition_profiles
CREATE TABLE IF NOT EXISTS public.pet_nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  food_brand TEXT,
  food_product TEXT,
  food_type TEXT CHECK (food_type IN ('dry', 'wet', 'raw', 'mixed')),
  package_size_grams INT,
  daily_grams INT,
  meals_per_day INT DEFAULT 2,
  allergy_info TEXT[],
  sensitivity_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pet_nutrition_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage pet nutrition profiles" ON public.pet_nutrition_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_nutrition_profiles.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

-- 2. feeding_logs
CREATE TABLE IF NOT EXISTS public.feeding_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  meal_time TIMESTAMPTZ,
  amount_grams INT,
  appetite_score INT,
  consumed_percent INT,
  stool_quality INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feeding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage feeding logs" ON public.feeding_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = feeding_logs.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

-- 3. weight_logs
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  weight_kg NUMERIC,
  body_condition_score INT,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage weight logs" ON public.weight_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = weight_logs.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

-- 4. food_inventory
CREATE TABLE IF NOT EXISTS public.food_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  current_stock_grams INT,
  estimated_daily_usage INT,
  last_refill_date TIMESTAMPTZ,
  next_refill_estimate TIMESTAMPTZ,
  low_stock_threshold_days INT DEFAULT 5
);

ALTER TABLE public.food_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage food inventory" ON public.food_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = food_inventory.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );
