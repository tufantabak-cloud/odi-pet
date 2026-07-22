require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log('--- Verifying Migration Columns on content_generation_job_sources ---');

  const { data, error } = await supabase
    .from('content_generation_job_sources')
    .select('id, source_url, verification_status')
    .limit(1);

  if (error) {
    console.error('Select error:', error.message);
  } else {
    console.log('Migration status verified: content_generation_job_sources table is ready.');
  }
}

applyMigration().catch(console.error);
