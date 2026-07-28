import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function resetPasswords() {
  console.log('Resetting passwords for test users...')

  const users = [
    { email: 'tufan.tabak@gmail.com', password: 'att1472o' },
    { email: 'test-caregiver@odi.pet', password: 'att1472o' }
  ]

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('List users error:', listError)
    return
  }

  for (const u of users) {
    const existing = listData.users.find(x => x.email === u.email)
    if (existing) {
      const { error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: u.password,
        email_confirm: true
      })
      if (error) {
        console.error(`Failed updating password for ${u.email}:`, error.message)
      } else {
        console.log(`Successfully updated password for ${u.email}`)
      }
    } else {
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true
      })
      if (createErr) {
        console.error(`Failed creating ${u.email}:`, createErr.message)
      } else {
        console.log(`Successfully created ${u.email}`)
      }
    }
  }

  console.log('Done resetting passwords.')
}

resetPasswords()
