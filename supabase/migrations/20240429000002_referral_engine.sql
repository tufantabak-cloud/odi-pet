-- Referral & Care Points support for invite acceptance

-- Add care_points to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS care_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_trial_until TIMESTAMPTZ;

-- Referral log table (fraud guard + analytics)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID NOT NULL REFERENCES public.pet_invites(id) ON DELETE CASCADE,
  rewarded_profile_id UUID NOT NULL REFERENCES public.profiles(id),
  reward_type TEXT NOT NULL, -- 'care_points' | 'pro_trial'
  amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invite_id, rewarded_profile_id)
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own rewards" ON public.referral_rewards
  FOR SELECT USING (rewarded_profile_id = auth.uid());
