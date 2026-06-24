import { createClient } from '@supabase/supabase-js';
export async function getHealthAlerts(petId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('vaccines').select('*').eq('pet_id', petId).limit(1);
  return data;
}