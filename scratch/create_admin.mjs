import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function run() {
  const email = 'admin@odipet.com'
  const password = 'Password123!'

  console.log(`Creating/updating ${email}...`)

  // Sign up user via auth admin API (so we don't have email verification blocking us locally)
  const { data: { user }, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'Antigravity', last_name: 'Admin' }
  })

  let userId = user?.id

  if (signUpError) {
    if (signUpError.message.includes('already exists')) {
      console.log("User already exists. Querying user ID...")
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error("List users error:", listError)
        return
      }
      const existing = users.users.find(u => u.email === email)
      userId = existing?.id
    } else {
      console.error("Auth creation error:", signUpError.message)
      return
    }
  }

  if (!userId) {
    console.error("Could not determine user ID.")
    return
  }

  console.log(`User ID is ${userId}. Updating profile...`)

  // Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      role: 'founder',
      first_name: 'Antigravity',
      last_name: 'Admin',
      email: email,
      updated_at: new Date().toISOString()
    })

  if (profileError) {
    console.error("Profile upsert error:", profileError.message)
  } else {
    console.log("Profile updated successfully with FOUNDER role!")
  }
}

run()
