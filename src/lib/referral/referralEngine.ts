import { createClient } from '@supabase/supabase-js';
export async function getReferrals(userId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('referrals').select('*').eq('referrer_id', userId).limit(5);
  return data;
}