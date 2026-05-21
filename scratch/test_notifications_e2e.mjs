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
  console.log("Fetching a pet and owner for testing...")
  const { data: owners, error: ownerErr } = await supabase
    .from('pet_owners')
    .select('pet_id, profile_id')
    .limit(1)

  if (ownerErr || !owners || owners.length === 0) {
    console.error("No pet owner found in database:", ownerErr)
    return
  }

  const { pet_id, profile_id } = owners[0]
  console.log(`Found Pet ID: ${pet_id}, Profile ID: ${profile_id}`)

  const todayStr = new Date().toISOString().split('T')[0]
  const now = new Date()
  
  // 20 minutes ago (to trigger overdue)
  const overdueTime = new Date(now.getTime() - 20 * 60000)
  const overdueTimeStr = overdueTime.toTimeString().split(' ')[0]

  console.log(`Creating test health_schedules record with due_date: ${todayStr}, due_time: ${overdueTimeStr} (overdue)...`)
  
  const { data: newSchedule, error: insertErr } = await supabase
    .from('health_schedules')
    .insert({
      pet_id,
      plan_type: 'checkup',
      title: 'E2E Test Görevi - Beslenme',
      category: 'Beslenme',
      sub_category: 'Kuru Mama',
      due_date: todayStr,
      due_time: overdueTimeStr,
      status: 'upcoming',
      notification_rule: {
        enabled: true,
        minutes_before: 15
      }
    })
    .select()

  if (insertErr || !newSchedule || newSchedule.length === 0) {
    console.error("Error creating test schedule:", insertErr)
    return
  }

  const scheduleId = newSchedule[0].id
  console.log(`Created schedule with ID: ${scheduleId}`)

  try {
    console.log("Calling RPC generate_schedule_notifications...")
    const { data: count, error: rpcErr } = await supabase.rpc('generate_schedule_notifications')
    if (rpcErr) {
      console.error("RPC Error:", rpcErr)
    } else {
      console.log(`RPC Success. Generated notifications count: ${count}`)
    }

    console.log("Fetching generated notifications from database...")
    const { data: notifs, error: fetchErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('pet_id', pet_id)
      .order('created_at', { ascending: false })
      .limit(3)

    if (fetchErr) {
      console.error("Fetch notifications error:", fetchErr)
    } else {
      console.log("Notifications for this pet:")
      console.log(JSON.stringify(notifs, null, 2))
    }

  } finally {
    // Cleanup
    console.log("Cleaning up test records...")
    const { error: delScheduleErr } = await supabase
      .from('health_schedules')
      .delete()
      .eq('id', scheduleId)

    if (delScheduleErr) {
      console.error("Error deleting test schedule:", delScheduleErr)
    } else {
      console.log("Successfully cleaned up test schedule.")
    }

    // Cleanup notifications
    const { error: delNotifErr } = await supabase
      .from('notifications')
      .delete()
      .eq('pet_id', pet_id)
      .ilike('title', '%E2E Test Görevi%')

    if (delNotifErr) {
      console.error("Error deleting test notifications:", delNotifErr)
    } else {
      console.log("Successfully cleaned up test notifications.")
    }
  }
}

test()
