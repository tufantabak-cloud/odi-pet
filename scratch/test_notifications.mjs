import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env keys")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  console.log("Calling RPC generate_schedule_notifications...")
  const { data, error } = await supabase.rpc('generate_schedule_notifications')
  if (error) {
    console.error("RPC Error:", error)
  } else {
    console.log("RPC Success. Returned generated notifications count:", data)
  }

  // Fetch recent notifications
  console.log("Checking recent notifications in database...")
  const { data: notifs, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (notifError) {
    console.error("Fetch notifications error:", notifError)
  } else {
    console.log("Recent notifications:")
    console.log(JSON.stringify(notifs, null, 2))
  }
}

test()
