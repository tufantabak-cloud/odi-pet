import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("No supabase key found!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding user...");
  // Use admin api to create user
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: 'test@odipet.com',
    password: 'password',
    email_confirm: true
  });
  if (userError) {
    console.error("Auth error:", userError.message);
    if (!userError.message.includes('already exists')) process.exit(1);
  }
  
  console.log("Getting user...");
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const testUser = users.find(u => u.email === 'test@odipet.com');
  if (!testUser) {
    console.error("User not found!");
    process.exit(1);
  }

  console.log("Seeding profile...");
  await supabase.from('profiles').upsert({ id: testUser.id, full_name: 'Test User', email: 'test@odipet.com' });

  console.log("Seeding pet...");
  const { error: petError } = await supabase.from('pets').upsert({
    id: '11b747b8-b719-4fe3-a782-7cd4cad70bc7',
    owner_id: testUser.id,
    name: 'Odi',
    species: 'dog',
    gender: 'male'
  });
  if (petError) console.error("Pet error:", petError.message);
  
  console.log("Done!");
}

seed();
