import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  })

  if (!res.ok) {
    console.error("Failed to fetch API specs:", res.statusText)
    return
  }

  const spec = await res.json()
  const paths = Object.keys(spec.paths || {})
  console.log("Exposed REST endpoints:")
  paths.forEach(p => {
    if (p.startsWith('/rpc/')) {
      console.log("  RPC:", p)
    } else {
      console.log("  Table/View:", p)
    }
  })
}

run()
