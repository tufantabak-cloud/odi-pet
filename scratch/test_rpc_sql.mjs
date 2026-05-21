import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function run() {
  const { data, error } = await supabase.rpc('pg_catalog_query', {
    query: 'SELECT version();'
  })
  
  if (error) {
    console.error("pg_catalog_query failed:", error.message, error)
  } else {
    console.log("pg_catalog_query success:", data)
  }
}

run()
