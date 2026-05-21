import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  const { data, error } = await supabase
    .from('vaccine_templates')
    .select('vaccine_name, vaccine_code, species, category')
    .is('profile_id', null)
    .order('species')
    .order('vaccine_name')

  if (error) {
    console.error(error)
  } else {
    console.log("DB TEMPLATES:")
    console.log(data)
  }
}

main()
