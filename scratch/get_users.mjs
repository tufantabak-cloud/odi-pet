import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function run() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')

  if (error) {
    console.error(error)
  } else {
    console.log(profiles)
  }
}

run()
