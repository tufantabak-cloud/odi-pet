import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seed() {
  console.log('Seeding local Supabase Auth users...')

  const users = [
    {
      id: '83000000-0000-0000-0000-000000000001',
      email: 'tufan.tabak@gmail.com',
      password: 'att1472o',
      user_metadata: { first_name: 'Tufan', last_name: 'Tabak' }
    },
    {
      id: '83000000-0000-0000-0000-000000000002',
      email: 'test-caregiver@odi.pet',
      password: 'att1472o',
      user_metadata: { first_name: 'Ayşe', last_name: 'Demir' }
    }
  ]

  for (const u of users) {
    // Delete existing if any to avoid hash mismatch
    await supabase.auth.admin.deleteUser(u.id).catch(() => {})

    const { data, error } = await supabase.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: u.user_metadata,
    })

    if (error) {
      console.error(`Failed to create ${u.email}:`, error.message)
    } else {
      console.log(`Created user ${u.email} (ID: ${data.user.id})`)
    }
  }

  console.log('Finished seeding Auth users.')
}

seed()
