import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  console.log("=== SUPABASE USER VERIFICATION ===")
  
  // 1. Fetch from public.profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
  
  if (pError) {
    console.error("Error fetching profiles:", pError.message)
    process.exit(1)
  }
  
  // 2. Fetch from auth.admin.listUsers (page 1)
  const { data: authData, error: aError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (aError) {
    console.error("Error fetching auth users:", aError.message)
    process.exit(1)
  }
  
  const authUsers = authData?.users || []
  
  console.log(`\nFound ${profiles.length} profiles and ${authUsers.length} auth users.\n`)
  
  const result = []
  
  for (const profile of profiles) {
    const authUser = authUsers.find(u => u.id === profile.id)
    
    // Check if there is a known seed password for the user in the codebase
    let knownPassword = "Bilinmiyor (Şifrelenmiş)"
    const email = profile.email || authUser?.email || "Email Yok"
    
    if (email.toLowerCase() === 'tufan.tabak@gmail.com') {
      knownPassword = "att1472o (Seed) veya password123"
    } else if (email.toLowerCase() === 'odiplatform@gmail.com') {
      knownPassword = "odi1472 (Seed) veya password123"
    } else if (email.toLowerCase() === 'testclinic@example.com') {
      knownPassword = "test123456 (Seed)"
    }
    
    result.push({
      fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'İsimsiz',
      email: email,
      role: profile.role || 'Yok',
      inAuth: authUser ? "Evet" : "Hayır (Sadece Profil)",
      userId: profile.id,
      password: knownPassword
    })
  }
  
  console.log(JSON.stringify(result, null, 2))
}

run().catch(err => {
  console.error("Fatal error:", err)
})
