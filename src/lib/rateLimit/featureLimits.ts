import { createClient } from '@supabase/supabase-js';
export async function checkFeatureLimit(featureName: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('onboarding_limits').select('*').eq('feature_name', featureName).limit(1);
  return data;
}