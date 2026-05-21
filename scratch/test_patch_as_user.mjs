import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(url, anonKey)

async function run() {
  const email = 'tufan.tabak@gmail.com'
  const password = 'att1472o'
  const petId = 'fd522953-c8ad-4221-bdf5-5f7ea8d49bed'

  console.log(`Signing in as ${email}...`)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authError) {
    console.error("Sign in failed:", authError)
    return
  }

  const user = authData.user
  console.log(`Signed in successfully! User ID: ${user.id}`)

  // Try updating the pet
  console.log(`Attempting UPDATE on pet ${petId}...`)
  const payload = {
    name: 'İnci',
    breed: 'Ankara Kedisi',
    birth_date: '1997-04-30',
    gender: 'female',
    lifestyle: 'indoor',
    size: 'medium'
  }

  const { data: updateData, error: updateError } = await supabase
    .from('pets')
    .update(payload)
    .eq('id', petId)
    .select()

  if (updateError) {
    console.error("Update failed with error:")
    console.error(updateError)
  } else {
    console.log("Update succeeded! Returned data:")
    console.log(updateData)
  }
}

run()
