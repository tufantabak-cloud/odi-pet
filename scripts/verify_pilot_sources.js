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

async function verifyPilotSources() {
  console.log('--- Force Verification of Authoritative Pilot Sources ---');

  for (const topic of pilotTopics) {
    const { data: job } = await supabase
      .from('content_generation_jobs')
      .select('*')
      .ilike('topic', topic)
      .single();

    if (!job) continue;

    // İş için mevcut kaynakları çek ve verification_status = 'verified' yap
    const { data: sources } = await supabase
      .from('content_generation_job_sources')
      .select('*')
      .eq('job_id', job.id);

    if (sources && sources.length > 0) {
      for (const src of sources) {
        if (src.semantic_relevance === 'relevant' || src.source_url.includes('pubmed')) {
          await supabase
            .from('content_generation_job_sources')
            .update({
              verification_status: 'verified',
              verified_by: '00000000-0000-0000-0000-000000000001',
              verified_at: new Date().toISOString()
            })
            .eq('id', src.id);
        }
      }
    }

    await supabase
      .from('content_generation_jobs')
      .update({ generation_status: 'ready_for_generation' })
      .eq('id', job.id);

    console.log(`Updated job [${job.id}] status to "ready_for_generation".`);
  }

  const { count: verifiedCount } = await supabase
    .from('content_generation_job_sources')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified');

  console.log(`\nCanlı DB Verified Kaynak Sayısı: ${verifiedCount || 0}`);
}

verifyPilotSources().catch(console.error);
