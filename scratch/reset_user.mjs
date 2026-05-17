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
  const email = 'odiplatform@gmail.com'
  const password = 'password123'
  
  console.log(`Checking if user ${email} exists in auth.admin...`)
  
  // List users
  const { data, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error("Error listing users:", listError.message)
    process.exit(1)
  }
  
  const users = data?.users || []
  console.log(`Found ${users.length} users in Supabase Auth:`)
  users.forEach(u => {
    console.log(`- Email: "${u.email}", ID: "${u.id}"`)
  })
  
  // Try case-insensitive matching
  const targetUser = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())
  
  if (targetUser) {
    console.log(`User found (ID: ${targetUser.id}). Resetting password to ${password}...`)
    
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      {
        password: password,
        email_confirm: true
      }
    )
    
    if (updateError) {
      console.error("Error updating user:", updateError.message)
    } else {
      console.log("User password reset successfully in auth!")
    }
    
    console.log("Ensuring profiles table has 'founder' role...")
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: targetUser.id,
        email: targetUser.email,
        role: 'founder'
      }, { onConflict: 'id' })
      
    if (profileError) {
      console.error("Error updating profiles table:", profileError.message)
    } else {
      console.log("Profile updated successfully in public.profiles table!")
    }
  } else {
    // If not found in the list, let's try to query the profiles table by email
    console.log(`User not found in auth list. Checking public.profiles table for email "${email}"...`)
    const { data: profileRow, error: pQueryError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle()
      
    if (profileRow) {
      console.log(`Found profile row in DB: ID=${profileRow.id}, Role=${profileRow.role}. Resetting auth user with this ID...`)
      
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        profileRow.id,
        {
          password: password,
          email_confirm: true
        }
      )
      
      if (updateError) {
        console.error("Error updating user by profile ID:", updateError.message)
      } else {
        console.log("User password reset successfully in auth!")
      }
      
      const { data: uProfile, error: uProfileError } = await supabase
        .from('profiles')
        .update({ role: 'founder' })
        .eq('id', profileRow.id)
        
      if (uProfileError) {
        console.error("Error setting role to founder:", uProfileError.message)
      } else {
        console.log("Profile role updated to 'founder' successfully!")
      }
    } else {
      console.log("No profile row found either. Let's try to search auth.users by paging or other details...")
      // Let's search by calling updateUserById or listUsers with higher limit if supported
      console.log("Creating user as fallback...")
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      })
      
      if (createError) {
        console.error("Error creating user:", createError.message)
      } else {
        const newUser = createData.user
        console.log(`User created successfully (ID: ${newUser.id})!`)
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: newUser.id,
            email: email,
            role: 'founder'
          }, { onConflict: 'id' })
          
        if (profileError) {
          console.error("Error setting profiles role:", profileError.message)
        } else {
          console.log("Profile set to 'founder' successfully!")
        }
      }
    }
  }
  
  console.log("\nProcess completed!")
}

run().catch(err => {
  console.error("Fatal error:", err)
})
