import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

console.log("Terminal Environment DB Check:")
console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("SUPABASE_SERVICE_ROLE_KEY (first 10 chars):", process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 15) + "..." : "undefined")
console.log("TEST_EMAIL:", process.env.TEST_EMAIL)
console.log("TEST_PASSWORD:", process.env.TEST_PASSWORD)
