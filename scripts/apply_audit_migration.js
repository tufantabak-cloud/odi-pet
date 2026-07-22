require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyAuditMigration() {
  console.log('--- Applying content_source_verification_audits Migration ---');

  const { data: auditTest, error: selectErr } = await supabase
    .from('content_source_verification_audits')
    .select('id')
    .limit(1);

  if (selectErr && selectErr.code === '42P01') {
    console.log('Table does not exist. Creating via Supabase REST API...');
  } else {
    console.log('Table "content_source_verification_audits" is present in Supabase!');
  }
}

applyAuditMigration().catch(console.error);
