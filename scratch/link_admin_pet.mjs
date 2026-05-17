import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function run() {
  const adminId = '34982f63-2cfb-4201-b401-ab41b4da6eae'
  
  // Find a pet
  const { data: pets } = await supabase.from('pets').select('id, name').limit(1)
  if (!pets || pets.length === 0) {
    console.log("No pets found in database.")
    return
  }
  const pet = pets[0]
  console.log(`Found pet: ${pet.name} (${pet.id})`)
  
  // Link pet to admin in pet_owners
  const { error } = await supabase.from('pet_owners').upsert({
    pet_id: pet.id,
    profile_id: adminId,
    role: 'owner'
  })
  
  if (error) {
    console.error("Link error:", error)
  } else {
    console.log(`Successfully linked pet ${pet.name} to admin user!`)
  }
}

run()
