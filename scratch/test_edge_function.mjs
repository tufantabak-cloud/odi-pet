import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env keys")
  process.exit(1)
}

async function run() {
  const url = `${supabaseUrl}/functions/v1/dispatch-notifications`
  console.log(`Triggering Edge Function: ${url}`)
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  })

  console.log("Response Status:", res.status)
  try {
    const data = await res.json()
    console.log("Response Body:")
    console.log(JSON.stringify(data, null, 2))
  } catch (err) {
    const text = await res.text()
    console.log("Raw Response Text:", text)
  }
}
run()
