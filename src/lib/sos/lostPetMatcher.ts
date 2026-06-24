import { createClient } from '@supabase/supabase-js';
export async function findMatches(lostPetId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('pets').select('*').limit(5);
  return data;
}