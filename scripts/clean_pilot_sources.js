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

async function cleanPilotData() {
  console.log('--- Cleaning Synthesized Pilot Sources & Resetting Status ---');

  // 1. Pilot İşleri Çek
  const { data: jobs } = await supabase
    .from('content_generation_jobs')
    .select('id, topic')
    .in('topic', pilotTopics);

  if (!jobs || jobs.length === 0) {
    console.log('No pilot jobs found to clean.');
    return;
  }

  const jobIds = jobs.map((j) => j.id);

  // 2. Mevcut proposed kaynakları rejected yap
  const { data: rejectedSources, error: rejErr } = await supabase
    .from('content_generation_job_sources')
    .update({
      verification_status: 'rejected',
      source_excerpt: 'REJECTED: Invalid or synthesized URL generated from topic text',
      verified_by: null,
      verified_at: null
    })
    .in('job_id', jobIds)
    .select();

  if (rejErr) {
    console.error('Error rejecting sources:', rejErr.message);
  } else {
    console.log(`Marked ${rejectedSources?.length || 0} synthesized sources as REJECTED.`);
  }

  // 3. İki pilot işin durumunu research_required yap
  const { error: updateErr } = await supabase
    .from('content_generation_jobs')
    .update({
      generation_status: 'research_required',
      last_error: null
    })
    .in('id', jobIds);

  if (updateErr) {
    console.error('Error resetting job status:', updateErr.message);
  } else {
    console.log('Successfully reset 2 pilot jobs to "research_required".');
  }

  // 4. Canlı DB Verified Kaynak Sayısını Doğrula
  const { count: verifiedCount } = await supabase
    .from('content_generation_job_sources')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified');

  console.log(`\nCanlı DB Verified Kaynak Sayısı: ${verifiedCount || 0}`);
}

cleanPilotData().catch(console.error);
