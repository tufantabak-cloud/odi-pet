import { createClient } from '@supabase/supabase-js';
export async function getStreak(userId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('user_activation_scores').select('score').eq('user_id', userId).limit(1);
  return data;
}