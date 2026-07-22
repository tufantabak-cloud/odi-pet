require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkProfiles() {
  const { data: prof, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles sample:', prof, error);
}

checkProfiles();
