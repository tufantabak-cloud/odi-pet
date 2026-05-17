import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function check() {
  console.log("Querying recent alerts...")
  const { data: alerts, error: alertsError } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
    
  if (alertsError) {
    console.error("Error fetching alerts:", alertsError.message)
  } else {
    console.log("Alerts:", alerts)
  }

  console.log("\nQuerying recent system logs...")
  const { data: logs, error: logsError } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
    
  if (logsError) {
    console.error("Error fetching system logs:", logsError.message)
  } else {
    console.log("System Logs:", logs)
  }

  console.log("\nQuerying recent event stream...")
  const { data: events, error: eventsError } = await supabase
    .from('event_stream')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
    
  if (eventsError) {
    console.error("Error fetching event stream:", eventsError.message)
  } else {
    console.log("Events:", events)
  }
}
check()
