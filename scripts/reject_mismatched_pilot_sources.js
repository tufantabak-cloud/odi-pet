require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const pilotTopics = [
  'Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları',
  'Köpeklerde Temel Sosyalleşme İlkeleri'
];

async function rejectMismatchedPilotSources() {
  console.log('--- Step 1: Rejecting Mismatched New Pilot Sources (PMID 36254884 & 32050186) ---');

  const { data: jobs } = await supabase
    .from('content_generation_jobs')
    .select('id, topic')
    .in('topic', pilotTopics);

  if (!jobs || jobs.length === 0) {
    console.log('No pilot jobs found.');
    return;
  }

  const jobIds = jobs.map((j) => j.id);

  // PMID 36254884 ve PMID 32050186'yı Reject et
  const { data: rejected } = await supabase
    .from('content_generation_job_sources')
    .update({
      verification_status: 'rejected',
      rejection_reason: 'topic_mismatch',
      semantic_relevance: 'not_relevant',
      source_excerpt: 'REJECTED: Topic mismatch - PubMed title not specifically matching hydration or socialization target.',
      verified_by: null,
      verified_at: null
    })
    .in('job_id', jobIds)
    .or('source_url.ilike.%36254884%,source_url.ilike.%32050186%')
    .select();

  console.log(`Marked ${rejected?.length || 0} sources as REJECTED (topic_mismatch).`);

  // İki pilot işi research_required ve generated_draft = null yap
  await supabase
    .from('content_generation_jobs')
    .update({
      generation_status: 'research_required',
      generated_draft: null,
      last_error: null
    })
    .in('id', jobIds);

  console.log('Successfully reset 2 pilot jobs to "research_required" and generated_draft = null.');

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

rejectMismatchedPilotSources().catch(console.error);
