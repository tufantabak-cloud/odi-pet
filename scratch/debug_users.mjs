import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function debug() {
  console.log("--- 10 Recent Profiles ---")
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
    
  if (pErr) console.error("Profiles error:", pErr)
  else console.log(JSON.stringify(profiles, null, 2))

  console.log("\n--- 10 Recent Pets ---")
  const { data: pets, error: petsErr } = await supabase
    .from('pets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (petsErr) console.error("Pets error:", petsErr)
  else console.log(JSON.stringify(pets, null, 2))

  console.log("\n--- 10 Recent Pet Owners ---")
  const { data: owners, error: ownersErr } = await supabase
    .from('pet_owners')
    .select('*')
    .limit(10)

  if (ownersErr) console.error("Pet Owners error:", ownersErr)
  else console.log(JSON.stringify(owners, null, 2))
}

debug()
