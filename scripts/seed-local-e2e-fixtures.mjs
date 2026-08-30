import { readFileSync } from 'node:fs'
import { URL, pathToFileURL } from 'node:url'

import { createClient } from '@supabase/supabase-js'

const fixtures = JSON.parse(
  readFileSync(new URL('./e2e-fixtures.json', import.meta.url), 'utf8')
)

export const LOCAL_E2E_EMAIL = fixtures.owner.email
export const LOCAL_E2E_PASSWORD = fixtures.owner.password
export const LOCAL_E2E_PET_ID = fixtures.petId
export const LOCAL_E2E_ADMIN_EMAIL = fixtures.admin.email
export const LOCAL_E2E_ADMIN_PASSWORD = fixtures.admin.password
export const LOCAL_E2E_CAREGIVER_EMAIL = fixtures.caregiver.email
export const LOCAL_E2E_CAREGIVER_PASSWORD = fixtures.caregiver.password

function assertLocalSupabase(apiUrl) {
  const url = new URL(apiUrl)
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('REFUSING_REMOTE_DATABASE_IN_E2E_FIXTURE')
  }
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    })
    if (error) throw error

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase()
    )
    if (user) return user
    if (data.users.length < 100) break
  }

  return null
}

async function ensureLocalUser(admin, { email, password, firstName, role }) {
  let user = await findUserByEmail(admin, email)
  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName },
    })
    if (error || !data.user) {
      throw error ?? new Error('LOCAL_E2E_USER_CREATION_FAILED')
    }
    user = data.user
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    email,
    first_name: firstName,
    role,
  })
  if (profileError) throw profileError

  return user
}

export async function seedLocalE2EFixtures({ apiUrl, serviceRoleKey }) {
  assertLocalSupabase(apiUrl)

  const admin = createClient(apiUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const user = await ensureLocalUser(admin, {
    email: LOCAL_E2E_EMAIL,
    password: LOCAL_E2E_PASSWORD,
    firstName: 'E2E Owner',
    role: 'owner',
  })

  const adminUser = await ensureLocalUser(admin, {
    email: LOCAL_E2E_ADMIN_EMAIL,
    password: LOCAL_E2E_ADMIN_PASSWORD,
    firstName: 'E2E Admin',
    role: 'admin',
  })

  const caregiverUser = await ensureLocalUser(admin, {
    email: LOCAL_E2E_CAREGIVER_EMAIL,
    password: LOCAL_E2E_CAREGIVER_PASSWORD,
    firstName: 'E2E Caregiver',
    role: 'owner',
  })

  const { error: subscriptionError } = await admin
    .from('user_subscriptions')
    .upsert(
      {
        profile_id: user.id,
        plan: 'free',
        status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_end: null,
      },
      { onConflict: 'profile_id' }
    )
  if (subscriptionError) throw subscriptionError

  const { error: petError } = await admin.from('pets').upsert({
    id: LOCAL_E2E_PET_ID,
    owner_id: user.id,
    name: 'Moka E2E',
    species: 'dog',
    breed: 'Golden Retriever',
    birth_date: '2022-05-10',
    gender: 'male',
    is_neutered: true,
    city: 'İstanbul',
    district: 'Kadıköy',
    is_demo: true,
  })
  if (petError) throw petError

  const { error: ownerError } = await admin
    .from('pet_owners')
    .upsert(
      {
        pet_id: LOCAL_E2E_PET_ID,
        profile_id: user.id,
        role: 'owner',
      },
      { onConflict: 'pet_id,profile_id' }
    )
  if (ownerError) throw ownerError

  return {
    email: LOCAL_E2E_EMAIL,
    password: LOCAL_E2E_PASSWORD,
    userId: user.id,
    petId: LOCAL_E2E_PET_ID,
    adminEmail: LOCAL_E2E_ADMIN_EMAIL,
    adminPassword: LOCAL_E2E_ADMIN_PASSWORD,
    adminUserId: adminUser.id,
    caregiverEmail: LOCAL_E2E_CAREGIVER_EMAIL,
    caregiverPassword: LOCAL_E2E_CAREGIVER_PASSWORD,
    caregiverUserId: caregiverUser.id,
  }
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiUrl || !serviceRoleKey) {
    throw new Error('LOCAL_E2E_SUPABASE_ENV_MISSING')
  }

  await seedLocalE2EFixtures({ apiUrl, serviceRoleKey })
  console.log('Local E2E fixtures are ready.')
}
