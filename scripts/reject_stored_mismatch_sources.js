require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const targetPmids = ['22005408', '29943634', '23018794', '30101101', '29190195'];
const pilotTopics = [
  'Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları',
  'Köpeklerde Temel Sosyalleşme İlkeleri'
];

async function rejectMismatchedSources() {
  console.log('--- Step 1: Rejecting 5 Mismatched Sources (stored_metadata_mismatch) ---');

  const { data: jobs } = await supabase
    .from('content_generation_jobs')
    .select('id, topic')
    .in('topic', pilotTopics);

  if (!jobs || jobs.length === 0) {
    console.log('No pilot jobs found.');
    return;
  }

  const jobIds = jobs.map((j) => j.id);

  // 5 PMID kaynağını stored_metadata_mismatch ile rejected yap
  const { data: rejected } = await supabase
    .from('content_generation_job_sources')
    .update({
      verification_status: 'rejected',
      rejection_reason: 'stored_metadata_mismatch',
      source_excerpt: 'REJECTED: Stored metadata mismatch - Will be replaced by authoritative NCBI ESummary response',
      verified_by: null,
      verified_at: null
    })
    .in('job_id', jobIds)
    .or(targetPmids.map((p) => `source_url.ilike.%${p}%`).join(','));

  console.log(`Updated ${rejected?.length || 0} sources to REJECTED (stored_metadata_mismatch).`);

  // Pilot işleri research_required yap
  await supabase
    .from('content_generation_jobs')
    .update({
      generation_status: 'research_required',
      generated_draft: null,
      last_error: null
    })
    .in('id', jobIds);

  console.log('Reset 2 pilot jobs to "research_required" and generated_draft = null.');

  // Canlı DB Kontrolleri
  const { count: verifiedCount } = await supabase
    .from('content_generation_job_sources')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified');

  const { count: draftCount } = await supabase
    .from('content_generation_jobs')
    .select('id', { count: 'exact', head: true })
    .not('generated_draft', 'is', null);

  const { count: articlesCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .in('title', pilotTopics);

  console.log(`\nCanlı DB Verified Kaynak Sayısı: ${verifiedCount || 0}`);
  console.log(`Canlı DB generated_draft Sayısı: ${draftCount || 0}`);
  console.log(`Canlı DB Articles Pilot Kayıt Sayısı: ${articlesCount || 0}`);
}

rejectMismatchedSources().catch(console.error);
