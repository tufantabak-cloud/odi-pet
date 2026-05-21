import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function check() {
  console.log("Checking columns of pets table...")
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .limit(1)

  if (error) {
    console.error("Failed to select from pets:", error.message)
  } else {
    console.log("Succeeded! Columns in pets:", Object.keys(data[0] || {}))
  }
}

check()
