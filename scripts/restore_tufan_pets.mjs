import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function restorePets() {
  console.log('Restoring pets for tufan.tabak@gmail.com...')

  const email = 'tufan.tabak@gmail.com'
  const password = 'att1472o'

  // 1. Ensure User in auth.users
  const { data: listData } = await supabase.auth.admin.listUsers()
  let user = listData.users.find(u => u.email === email)

  if (!user) {
    const { data: createData, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: 'Tufan', last_name: 'Tabak' }
    })
    if (error) {
      console.error('Failed to create user:', error)
      return
    }
    user = createData.user
  } else {
    await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { first_name: 'Tufan', last_name: 'Tabak' }
    })
  }

  const userId = user.id
  console.log(`User ID: ${userId}`)

  // 2. Profile
  await supabase.from('profiles').upsert({
    id: userId,
    first_name: 'Tufan',
    last_name: 'Tabak',
    email: email,
  })

  // 3. Pets to insert/restore
  const petsToRestore = [
    {
      id: '84000000-0000-0000-0000-000000000001',
      owner_id: userId,
      name: 'Pamuk',
      species: 'dog',
      breed: 'Golden Retriever',
      gender: 'male',
      birth_date: '2023-01-15',
      is_neutered: true,
      city: 'İstanbul'
    },
    {
      id: '84000000-0000-0000-0000-000000000002',
      owner_id: userId,
      name: 'Luna',
      species: 'cat',
      breed: 'British Shorthair',
      gender: 'female',
      birth_date: '2022-06-10',
      is_neutered: true,
      city: 'İstanbul'
    }
  ]

  for (const pet of petsToRestore) {
    const { error: petErr } = await supabase.from('pets').upsert(pet)
    if (petErr) {
      console.error(`Error inserting ${pet.name}:`, petErr.message)
      continue
    }

    // Insert legacy pet_members
    await supabase.from('pet_members').upsert({
      pet_id: pet.id,
      profile_id: userId,
      role: 'owner'
    }, { onConflict: 'pet_id,profile_id' })

    // Insert canonical pet_memberships
    await supabase.from('pet_memberships').upsert({
      pet_id: pet.id,
      profile_id: userId,
      role: 'primary_owner',
      status: 'active',
      source: 'migration'
    }, { onConflict: 'pet_id,profile_id' })

    // Insert weight log
    await supabase.from('weight_logs').upsert({
      pet_id: pet.id,
      profile_id: userId,
      weight_kg: pet.species === 'dog' ? 24.5 : 4.2,
      created_at: new Date().toISOString()
    })

    console.log(`Successfully restored pet: ${pet.name} (${pet.species})`)
  }

  console.log('Restoration completed successfully!')
}

restorePets()
