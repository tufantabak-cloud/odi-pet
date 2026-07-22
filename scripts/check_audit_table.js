require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAuditTable() {
  const { data, error } = await supabase.from('content_source_verification_audits').select('*').limit(5);
  console.log('Audits data:', data, error);
}

checkAuditTable();
