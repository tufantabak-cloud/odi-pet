import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function check() {
  const { data, error } = await supabase.from('vaccine_templates').select('*').not('profile_id', 'is', null)
  console.log(JSON.stringify(data, null, 2))
}
check()
