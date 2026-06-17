-- ============================================================
-- Referral System Migration
-- Created: 2026-06-17
-- ============================================================

-- 1. profiles tablosuna referral_code ekle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Mevcut kullanıcılara otomatik kod üret
UPDATE public.profiles
SET referral_code = 'ODI-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 5))
WHERE referral_code IS NULL;

-- 3. Yeni kullanıcılar için otomatik kod üreten fonksiyon + trigger
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'ODI-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 5));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- 4. referrals tablosu
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- 5. user_badges tablosu
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- 6. RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;
CREATE POLICY "referrals_insert_own" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_id);

DROP POLICY IF EXISTS "badges_select_own" ON public.user_badges;
CREATE POLICY "badges_select_own" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "badges_insert_own" ON public.user_badges;
CREATE POLICY "badges_insert_own" ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

