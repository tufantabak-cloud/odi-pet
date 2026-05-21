import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function run() {
  // First get a pet ID
  const { data: pets, error: fetchError } = await supabase
    .from('pets')
    .select('id, name')
    .limit(1)

  if (fetchError || !pets || pets.length === 0) {
    console.error("Failed to fetch a pet:", fetchError)
    return
  }

  const petId = pets[0].id
  console.log(`Testing PATCH on pet ID: ${petId} (${pets[0].name})`)

  // Let's try updating lifestyle
  const { data: updateData, error: updateError } = await supabase
    .from('pets')
    .update({
      lifestyle: 'indoor',
      size: 'medium'
    })
    .eq('id', petId)

  if (updateError) {
    console.error("PATCH update failed with error:")
    console.error(updateError)
  } else {
    console.log("PATCH update succeeded! (This means the columns exist and something else is wrong)")
    console.log(updateData)
  }
}

run()
