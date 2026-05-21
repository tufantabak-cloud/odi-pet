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

async function run() {
  console.log('--- Database Setup for Notification Test ---')

  const scheduleId = '87c60fee-7369-4865-889d-004d3b42ce4d'
  
  // 1. Update the schedule to be past (e.g., 20:45) so it counts as overdue
  // Current time is ~20:52. Setting due_time to 20:45 makes it overdue.
  console.log(`Updating health schedule ${scheduleId} due_time to 20:45:00...`)
  const { error: updateErr } = await supabase
    .from('health_schedules')
    .update({
      due_date: '2026-05-21',
      due_time: '20:45:00',
      status: 'upcoming', // reset status to upcoming
      notification_rule: { enabled: true, frequency: 'once', minutes_before: 0 }
    })
    .eq('id', scheduleId)

  if (updateErr) {
    console.error('Failed to update schedule:', updateErr)
    return
  }
  console.log('Schedule updated successfully!')

  // 2. Clear old notifications in last 48h for this user to make sure de-duplication doesn't block it
  console.log('Clearing recent notifications to prevent de-duplication from blocking the test...')
  const { error: deleteNotifErr } = await supabase
    .from('notifications')
    .delete()
    .eq('profile_id', '62ed8fee-87b1-4c99-8087-008652b12e2e')

  if (deleteNotifErr) {
    console.error('Failed to clear notifications:', deleteNotifErr)
  } else {
    console.log('Notifications cleared successfully!')
  }

  // 3. Call generate_schedule_notifications RPC to create the notification in-app
  console.log('Calling generate_schedule_notifications() RPC...')
  const { data: count, error: rpcErr } = await supabase.rpc('generate_schedule_notifications')
  if (rpcErr) {
    console.error('RPC Error:', rpcErr)
    return
  }
  console.log(`RPC completed! Generated ${count} notifications.`)

  // 4. Fetch the generated notification
  const { data: newNotifs, error: fetchNotifsErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', '62ed8fee-87b1-4c99-8087-008652b12e2e')
    .order('created_at', { ascending: false })

  if (fetchNotifsErr) {
    console.error('Failed to fetch new notifications:', fetchNotifsErr)
    return
  }
  console.log('Newly generated notifications in DB:', newNotifs)

  // 5. Trigger the Supabase Edge Function to dispatch the email and web pushes!
  console.log('Triggering dispatch-notifications Edge Function...')
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/dispatch-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({})
    })
    const json = await res.json()
    console.log('Edge Function Response:', json)
  } catch (err) {
    console.error('Failed to call Edge Function:', err)
  }
}

run()
