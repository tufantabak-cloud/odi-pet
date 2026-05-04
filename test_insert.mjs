import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function test() {
  const { data: users } = await supabase.auth.admin.listUsers()
  // Wait, anon key cannot use auth.admin.listUsers().
  // Let me just insert directly if RLS allows, or check policies.
  const { data, error } = await supabase.from('vaccine_templates').insert({
    profile_id: '162f3c22-4b97-4073-aa71-421714ca4552', // fake UUID
    species: 'dog',
    vaccine_code: 'TEST',
    vaccine_name: 'Test',
    category: 'vaccine',
    mandatory_level: 'optional',
    dose_count: 1,
    first_dose_week: 6,
    is_active: false
  })
  console.log("Insert result:", error ? error.message : "Success")
}
test()
