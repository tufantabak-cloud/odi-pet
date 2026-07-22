require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupTestTitleSource() {
  console.log('=== Cleaning Up Test Title Source from Production Job ===');

  // "Test Title" kaynağını reddet veya sil
  const { data: testSources, error: fetchErr } = await supabase
    .from('content_generation_job_sources')
    .select('id, job_id, source_title')
    .ilike('source_title', '%Test Title%');

  if (fetchErr) {
    console.error('Error fetching test sources:', fetchErr.message);
    return;
  }

  console.log(`Found ${testSources?.length || 0} Test Title sources.`);

  for (const src of testSources || []) {
    const { error: updErr } = await supabase
      .from('content_generation_job_sources')
      .update({
        verification_status: 'rejected',
        verified_by: null,
        verified_at: null,
        source_excerpt: 'REJECTED: Test data'
      })
      .eq('id', src.id);

    if (updErr) {
      console.error(`Error rejecting test source [${src.id}]:`, updErr.message);
    } else {
      console.log(`+ Successfully set verification_status='rejected' for Test Title source [${src.id}]`);
    }
  }

  // Köpek İşindeki Doğrulanmış Kaynak Sayısını Kontrol Et
  const { data: dogJob } = await supabase
    .from('content_generation_jobs')
    .select('id')
    .ilike('topic', '%Köpeklerde Temel Sosyalleşme%')
    .single();

  if (dogJob) {
    const { data: verifiedDogSources } = await supabase
      .from('content_generation_job_sources')
      .select('id, source_title, source_url')
      .eq('job_id', dogJob.id)
      .eq('verification_status', 'verified');

    console.log(`\nVerified Sources in Dog Job [${dogJob.id}]: (${verifiedDogSources?.length || 0} / 2)`);
    (verifiedDogSources || []).forEach((s) => console.log(`  - [${s.id}] ${s.source_url} ("${s.source_title}")`));
  }
}

cleanupTestTitleSource().catch(console.error);
