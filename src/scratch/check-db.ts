import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export async function checkVaccines() {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase.from('vaccines').select('*')
  console.log('Vaccines in DB:', data)
  console.log('Error:', error)
}
