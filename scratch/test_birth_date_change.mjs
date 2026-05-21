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

  // 1. Fetch pet to see current birth date
  const { data: pet, error: fetchError } = await supabase
    .from('pets')
    .select('birth_date, species')
    .eq('id', petId)
    .single()

  if (fetchError) {
    console.error("Fetch pet error:", fetchError)
    return
  }

  const newBirthDate = pet.birth_date === '1997-04-30' ? '1997-05-01' : '1997-04-30'
  console.log(`Current birth date: ${pet.birth_date}. Setting new birth date: ${newBirthDate}`)

  // Try updating the birth date in pets
  console.log(`Updating birth date in pets...`)
  const { data: updateData, error: updateError } = await supabase
    .from('pets')
    .update({ birth_date: newBirthDate })
    .eq('id', petId)
    .select()

  if (updateError) {
    console.error("Update pet error:", updateError)
    return
  }

  console.log("Update pet succeeded! Now simulating the care_plans deletion and insertion...")

  // Delete existing care plans (reproducing the code from the route)
  const { data: delData, error: delError } = await supabase
    .from('care_plans')
    .delete()
    .eq('pet_id', petId)
    .or('title.ilike.%Karma%,title.ilike.%Kuduz%,title.ilike.%Corona%,title.ilike.%Lösemi%')

  if (delError) {
    console.error("Care plans DELETE error:")
    console.error(delError)
    return
  }
  console.log("Care plans DELETE succeeded!")

  // Let's generate and insert new care plans
  // Let's mock generateVaccinationPlan (since it's JS, we can just do it here)
  const plans = [
    { title: 'Karma Aşı (FVRCP) (1. Doz)', description: 'Rhinotracheitis, Calicivirus, Panleukopenia', due_date: newBirthDate },
    { title: 'Karma Aşı (FVRCP) (2. Doz)', description: 'FVRCP Booster', due_date: newBirthDate }
  ]

  const carePlansPayload = plans.map(p => ({
    pet_id: petId,
    title: p.title,
    description: p.description,
    due_date: p.due_date
  }))

  console.log("Inserting new care plans:", carePlansPayload)
  const { data: insData, error: insError } = await supabase
    .from('care_plans')
    .insert(carePlansPayload)
    .select()

  if (insError) {
    console.error("Care plans INSERT error:")
    console.error(insError)
  } else {
    console.log("Care plans INSERT succeeded! Data:", insData)
  }
}

run()
