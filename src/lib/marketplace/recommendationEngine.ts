import { createClient } from '@supabase/supabase-js';
export async function recommendProducts() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('marketplace_products').select('*').limit(5);
  return data;
}