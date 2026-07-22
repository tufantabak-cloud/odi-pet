require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSourcesColumns() {
  const { data, error } = await supabase.from('content_generation_job_sources').select('*').limit(1);
  console.log('Sources columns sample:', data, error);
}

checkSourcesColumns();
