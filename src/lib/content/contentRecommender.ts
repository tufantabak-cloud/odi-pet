import { createClient } from '@supabase/supabase-js';
export async function recommendArticles() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('articles').select('*').limit(5);
  return data;
}