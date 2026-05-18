import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  console.log("=== Listing ALL users with page 1 to 5, perPage 100 ===")
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) {
      console.error(`Error page ${page}:`, error.message)
      break
    }
    const users = data?.users || []
    if (users.length === 0) {
      console.log(`Page ${page} has 0 users.`)
      break
    }
    console.log(`Page ${page} has ${users.length} users:`)
    users.forEach(u => {
      console.log(`- ID: ${u.id}`)
      console.log(`  Email: "${u.email}"`)
      console.log(`  Confirm: ${u.email_confirmed_at}`)
      console.log(`  Identities:`, u.identities)
      console.log(`  User Metadata:`, u.user_metadata)
    })
  }
}

run()
