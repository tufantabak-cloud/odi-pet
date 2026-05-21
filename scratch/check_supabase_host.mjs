import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (url) {
  const parsed = new URL(url)
  console.log("Supabase URL Host:", parsed.host)
  console.log("Supabase URL Protocol:", parsed.protocol)
} else {
  console.log("No NEXT_PUBLIC_SUPABASE_URL found")
}
