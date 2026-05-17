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
  const email = 'tufan.tabak@gmail.com'
  console.log(`Setting role of ${email} to 'founder' in public.profiles...`)
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'founder' })
    .eq('email', email)
    
  if (error) {
    console.error("Error updating role:", error.message)
    process.exit(1)
  }
  
  console.log(`Successfully updated ${email} to 'founder'! You can now log in with your existing password and access /admin.`)
}

run().catch(err => {
  console.error("Fatal error:", err)
})
