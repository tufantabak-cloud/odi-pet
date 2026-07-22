require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const targetPmids = ['22005408', '29943634', '23018794', '30101101'];

async function checkHumanVerificationStatus() {
  console.log('=== Checking Genuine Human Verification Status in Live DB ===');

  const { data: sources } = await supabase
    .from('content_generation_job_sources')
    .select('*')
    .or(targetPmids.map((p) => `source_url.ilike.%${p}%`).join(','));

  console.log(`Found ${sources?.length || 0} matching sources.`);

  const { data: audits } = await supabase
    .from('content_source_verification_audits')
    .select('*');

  console.log(`Found ${audits?.length || 0} audit log records.`);

  const verifiedSources = (sources || []).filter((s) => s.verification_status === 'verified');
  console.log(`Verified Sources Count: ${verifiedSources.length}`);

  for (const src of sources || []) {
    console.log(`- Source [${src.external_identifier}]: status="${src.verification_status}", verified_by="${src.verified_by || 'null'}"`);
  }
}

checkHumanVerificationStatus().catch(console.error);
