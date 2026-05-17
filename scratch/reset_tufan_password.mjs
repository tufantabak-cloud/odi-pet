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
  const accounts = [
    { email: 'tufan.tabak@gmail.com', id: 'd782289b-c780-453f-b04b-55e335e4c354' },
    { email: 'tufan.tabak.old@gmail.com', id: '023dfa10-fe85-42b8-a51c-ad337aa12cdf' }
  ]
  const newPassword = 'password123'

  for (const account of accounts) {
    console.log(`\nProcessing account: ${account.email} (ID: ${account.id})...`)
    
    // 1. Reset password in auth
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      account.id,
      {
        password: newPassword,
        email_confirm: true
      }
    )
    
    if (updateError) {
      console.error(`Error resetting password for ${account.email}:`, updateError.message)
    } else {
      console.log(`Successfully reset password to "${newPassword}" for ${account.email} in auth!`)
    }
    
    // 2. Ensure role is 'founder' in profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: account.id,
        email: account.email,
        role: 'founder'
      }, { onConflict: 'id' })
      
    if (profileError) {
      console.error(`Error updating role for ${account.email} in profiles:`, profileError.message)
    } else {
      console.log(`Successfully ensured role is "founder" for ${account.email} in profiles!`)
    }
  }
  
  console.log("\nAll requested password resets and role assignments completed successfully!")
}

run().catch(err => {
  console.error("Fatal error during execution:", err)
})
