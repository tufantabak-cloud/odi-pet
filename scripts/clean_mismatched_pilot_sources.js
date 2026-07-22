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

async function cleanMismatchedData() {
  console.log('--- Step 1: Cleaning Mismatched Pilot Sources & Resetting Jobs ---');

  const { data: jobs } = await supabase
    .from('content_generation_jobs')
    .select('id, topic')
    .in('topic', pilotTopics);

  if (!jobs || jobs.length === 0) {
    console.log('No pilot jobs found.');
    return;
  }

  const jobIds = jobs.map((j) => j.id);

  // 1. Topic Mismatch PMID'lerini Reject et
  await supabase
    .from('content_generation_job_sources')
    .update({
      verification_status: 'rejected',
      source_excerpt: 'REJECTED: Topic mismatch - PubMed study not specifically for target topic',
      verified_by: null,
      verified_at: null
    })
    .in('job_id', jobIds)
    .or('source_url.ilike.%31584210%,source_url.ilike.%28456123%');

  // 2. 404 AAHA URL'sini Reject et
  await supabase
    .from('content_generation_job_sources')
    .update({
      verification_status: 'rejected',
      source_excerpt: 'REJECTED: Canonical URL not found (HTTP 404)',
      verified_by: null,
      verified_at: null
    })
    .in('job_id', jobIds)
    .ilike('source_url', '%aaha.org%');

  // 3. WSAVA kaynağını partially_relevant yap ve gerçek adını sakla
  await supabase
    .from('content_generation_job_sources')
    .update({
      source_title: 'WSAVA Global Nutrition Guidelines',
      verification_status: 'proposed',
      source_excerpt: 'Partially Relevant: General WSAVA nutrition guide, not hydration-specific.'
    })
    .in('job_id', jobIds)
    .ilike('source_url', '%wsava.org%');

  // 4. İki pilot işi tekrar research_required durumuna al
  await supabase
    .from('content_generation_jobs')
    .update({
      generation_status: 'research_required',
      last_error: null
    })
    .in('id', jobIds);

  console.log('Successfully reset 2 pilot jobs to "research_required".');

  // 5. Canlı DB Verified Kaynak Sayısı Kontrolü
  const { count: verifiedCount } = await supabase
    .from('content_generation_job_sources')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified');

  // 6. Articles Tablosu Pilot Aktarım Kontrolü
  const { count: articlesCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .in('title', pilotTopics);

  console.log(`\nCanlı DB Verified Kaynak Sayısı: ${verifiedCount || 0}`);
  console.log(`Canlı DB Articles Pilot Kayıt Sayısı: ${articlesCount || 0}`);
}

cleanMismatchedData().catch(console.error);
