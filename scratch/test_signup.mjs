import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function test() {
  const email = `testuser_${Date.now()}@odipet.com`
  const password = 'Password123!'
  const name = 'E2E Test User'
  
  console.log(`Signing up ${email}...`)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: name
      }
    }
  })
  
  if (error) {
    console.error("Sign up error:", error)
  } else {
    console.log("Sign up success! User:", data.user?.id)
    
    // Now check if a profile was created using service key (bypasses RLS)
    console.log("Checking public.profiles table for user...")
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user?.id)
      .maybeSingle()
      
    if (profileError) {
      console.error("Profile query error:", profileError)
    } else {
      console.log("Profile created:", profile)
    }
  }
}
test()
