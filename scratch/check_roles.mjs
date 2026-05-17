import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  console.log("Fetching all profiles and their roles...")
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, role, first_name, last_name')
  
  if (error) {
    console.error("Error fetching profiles:", error.message)
    process.exit(1)
  }
  
  console.log(`Found ${profiles.length} profiles:`)
  profiles.forEach(p => {
    console.log(`- Profile: ID: "${p.id}", Email: "${p.email}", Role: "${p.role}", Name: "${p.first_name || ''} ${p.last_name || ''}"`)
  })
}

run().catch(err => {
  console.error("Fatal error:", err)
})
