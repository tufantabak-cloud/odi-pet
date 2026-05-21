import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function run() {
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'tufan.tabak@gmail.com')
    .single()

  if (userError || !user) {
    console.error("User not found in profiles:", userError?.message)
    return
  }

  console.log("User:", user)

  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id, name, owner_id')
    .eq('owner_id', user.id)

  if (petsError) {
    console.error("Error fetching pets:", petsError.message)
    return
  }

  console.log("Pets:", pets)
}

run()
