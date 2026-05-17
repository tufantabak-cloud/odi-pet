import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function inspect() {
  console.log("--- Querying RLS Policies ---")
  const { data: policies, error: polErr } = await supabase
    .from('pg_policies') // Wait, pg_policies isn't exposed directly via PostgREST by default, let's run it via RPC or check if we can query it, or do a simple direct test
    
  // If pg_policies is not available via PostgREST, let's try running direct SQL or query something else.
  // Wait, let's run a test query on subscriptions
  console.log("--- Querying subscriptions table ---")
  const { data: subs, error: subErr } = await supabase
    .from('subscriptions')
    .select('*')
    .limit(1)
  
  if (subErr) {
    console.error("Error on 'subscriptions':", subErr.message)
    console.log("Let's try 'user_subscriptions' instead:")
    const { data: userSubs, error: userSubErr } = await supabase
      .from('user_subscriptions')
      .select('*')
      .limit(1)
    if (userSubErr) {
      console.error("Error on 'user_subscriptions':", userSubErr.message)
    } else {
      console.log("Success on 'user_subscriptions':", userSubs)
    }
  } else {
    console.log("Success on 'subscriptions':", subs)
  }

  // Let's check event_stream vs user_activities
  console.log("--- Querying event_stream table ---")
  const { data: events, error: eventErr } = await supabase
    .from('event_stream')
    .select('*')
    .limit(1)
  if (eventErr) {
    console.error("Error on 'event_stream':", eventErr.message)
  } else {
    console.log("Success on 'event_stream':", events)
  }
}

inspect()
