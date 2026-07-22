require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function getExistingAuthUser() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error || !users || users.users.length === 0) {
    console.log('No auth users found via admin API.');
    // Profiles tablosundan ID alalım
    const { data: profs } = await supabase.from('profiles').select('id, role, email').limit(5);
    console.log('Existing profiles:', profs);
  } else {
    console.log('Found Auth Users:', users.users.map(u => ({ id: u.id, email: u.email })));
  }
}

getExistingAuthUser().catch(console.error);
