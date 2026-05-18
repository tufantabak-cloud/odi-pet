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

async function getOrCreateUser(email, password, firstName, lastName, role) {
  console.log(`\nProcessing user: ${email}...`)
  
  // 1. Check if user exists in the first page of auth.admin (quick check)
  const { data: authData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (listError) {
    console.error("Error listing users:", listError.message)
    return null
  }
  
  const existingUser = authData?.users?.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())
  let userId = null
  
  if (existingUser) {
    console.log(`- User exists in first page of auth (ID: ${existingUser.id}). Updating password and confirming...`)
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: password,
        email_confirm: true
      }
    )
    if (updateError) {
      console.error(`- Error updating auth user: ${updateError.message}`)
      return null
    }
    userId = existingUser.id
    console.log(`- Successfully updated password to "${password}"`)
  } else {
    console.log(`- User not found in first page of auth. Trying to create user...`)
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`
      }
    })
    
    if (createError) {
      if (createError.message.includes('already been registered') || createError.status === 400 || createError.status === 422) {
        console.log(`- User is already registered. Querying profiles table for ID...`)
        const { data: pRow, error: pQueryError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle()
          
        if (pQueryError || !pRow) {
          console.log(`- Profile row not found by email. Searching auth users page-by-page...`)
          let page = 1
          let foundUser = null
          while (true) {
            const { data: pageData, error: pageError } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
            if (pageError || !pageData || pageData.users.length === 0) break
            foundUser = pageData.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())
            if (foundUser) break
            page++
          }
          if (foundUser) {
            userId = foundUser.id
          } else {
            console.error(`- Could not find user ID for ${email}`)
            return null
          }
        } else {
          userId = pRow.id
        }
        
        console.log(`- Found User ID: ${userId}. Updating password and confirming...`)
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          {
            password: password,
            email_confirm: true
          }
        )
        if (updateError) {
          console.error(`- Error updating auth user: ${updateError.message}`)
          return null
        }
        console.log(`- Successfully updated password to "${password}"`)
      } else {
        console.error(`- Error creating auth user: ${createError.message}`)
        return null
      }
    } else {
      userId = createData.user.id
      console.log(`- Successfully created user with ID: ${userId} and password "${password}"`)
    }
  }
  
  // 2. Ensure profile exists and has the correct role
  console.log(`- Setting/updating public.profiles table (ID: ${userId}, Role: ${role})...`)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      role: role,
      first_name: firstName,
      last_name: lastName
    }, { onConflict: 'id' })
    
  if (profileError) {
    console.error(`- Error updating profile in database: ${profileError.message}`)
    return null
  }
  console.log(`- Successfully set profile role to "${role}"!`)
  
  return userId
}

async function run() {
  // Reset/create tufan.tabak@gmail.com
  const tufanId = await getOrCreateUser(
    'tufan.tabak@gmail.com',
    'att1472o',
    'Tufan',
    'Tabak',
    'owner'
  )
  
  // Reset/create odiplatform@gmail.com
  const odiId = await getOrCreateUser(
    'odiplatform@gmail.com',
    'odi1472',
    'Odi',
    'Platform',
    'founder'
  )
  
  // Reset/create testclinic@example.com
  const clinicUserId = await getOrCreateUser(
    'testclinic@example.com',
    'test123456',
    'Test',
    'Clinic',
    'admin'
  )
  
  if (clinicUserId) {
    // 3. For the clinic admin, let's link them to a clinic so they can see data on their dashboard
    console.log(`\nChecking clinic memberships for testclinic@example.com...`)
    const { data: existingMemberships, error: mQueryError } = await supabase
      .from('clinic_memberships')
      .select('clinic_id')
      .eq('profile_id', clinicUserId)
      
    if (mQueryError) {
      console.error("Error querying clinic memberships:", mQueryError.message)
    } else if (existingMemberships && existingMemberships.length > 0) {
      console.log(`- Already belongs to clinic ID: ${existingMemberships[0].clinic_id}`)
    } else {
      console.log("- No membership found. Linking to the first clinic in the database...")
      const { data: clinics, error: cQueryError } = await supabase
        .from('clinics')
        .select('id, name')
        .limit(1)
        
      if (cQueryError) {
        console.error("Error fetching clinics:", cQueryError.message)
      } else if (clinics && clinics.length > 0) {
        const targetClinic = clinics[0]
        console.log(`- Selected clinic: "${targetClinic.name}" (ID: ${targetClinic.id})`)
        
        const { error: insertError } = await supabase
          .from('clinic_memberships')
          .insert({
            profile_id: clinicUserId,
            clinic_id: targetClinic.id
          })
          
        if (insertError) {
          console.error("- Error creating clinic membership:", insertError.message)
        } else {
          console.log(`- Successfully created membership linking to "${targetClinic.name}"!`)
        }
      }
    }
  }
  
  console.log("\n=== ALL USER SETUPS COMPLETED ===")
}

run().catch(err => {
  console.error("Fatal error:", err)
})
