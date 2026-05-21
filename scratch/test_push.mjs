import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testJoin() {
  console.log('--- Testing Notification Fetch and Join ---')
  
  const { data: unsent, error: fetchErr } = await supabase
    .from("notifications")
    .select(`
      id,
      profile_id,
      title,
      message,
      type,
      profiles!notifications_profile_id_fkey (
        email
      )
    `)
    .eq("sent_email", false)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })

  if (fetchErr) {
    console.error('Fetch error:', fetchErr)
    return
  }

  console.log('Unsent notifications with profile email:', JSON.stringify(unsent, null, 2))
}

testJoin()
