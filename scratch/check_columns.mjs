import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function test() {
  console.log("Checking columns of health_schedules...")
  const { data, error } = await supabase
    .from('health_schedules')
    .select('id, category, sub_category, notes')
    .limit(1)

  if (error) {
    console.error("Schema check failed:", error.message)
  } else {
    console.log("Schema check succeeded! New columns are active on remote Supabase.")
    console.log("Sample data:", data)
  }
}

test()
