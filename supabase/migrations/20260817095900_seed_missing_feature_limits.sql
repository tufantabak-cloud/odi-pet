-- Seed missing feature_limits for premium tiers based on free tier
-- This prevents the paywall from breaking and ensures premium users at least get free quotas
INSERT INTO public.feature_limits
  (feature_key, plan_tier, limit_type, limit_value, window_days, is_enabled)
SELECT fl.feature_key, t.plan_tier,
       fl.limit_type, fl.limit_value, fl.window_days, fl.is_enabled
FROM public.feature_limits fl
CROSS JOIN (VALUES ('pro'::public.plan_tier_enum),
                   ('ai_plus'::public.plan_tier_enum)) AS t(plan_tier)
WHERE fl.plan_tier = 'free'
ON CONFLICT (feature_key, plan_tier) DO NOTHING;
