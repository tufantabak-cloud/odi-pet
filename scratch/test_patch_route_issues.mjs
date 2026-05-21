import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function run() {
  const petId = 'fd522953-c8ad-4221-bdf5-5f7ea8d49bed'
  console.log(`Checking DB for pet: ${petId}`)

  // 1. Get pet info
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('*')
    .eq('id', petId)
    .single()

  if (petError) {
    console.error("Pet fetch error:", petError)
  } else {
    console.log("Pet data:", pet)
  }

  // 2. Get pet owners
  const { data: owners, error: ownersError } = await supabase
    .from('pet_owners')
    .select('*')
    .eq('pet_id', petId)

  if (ownersError) {
    console.error("Pet owners fetch error:", ownersError)
  } else {
    console.log("Pet owners:", owners)
  }

  // 3. Get care plans
  const { data: carePlans, error: carePlansError } = await supabase
    .from('care_plans')
    .select('*')
    .eq('pet_id', petId)

  if (carePlansError) {
    console.error("Care plans fetch error:", carePlansError)
  } else {
    console.log(`Found ${carePlans ? carePlans.length : 0} care plans:`, carePlans)
  }
}

run()
