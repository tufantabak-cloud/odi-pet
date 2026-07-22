require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function reportPilotSources() {
  console.log('--- Fetching Pilot Jobs and Sources Report ---');

  const { data: jobs, error: jErr } = await supabase
    .from('content_generation_jobs')
    .select('*, content_generation_job_sources(*)')
    .in('topic', [
      'Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları',
      'Köpeklerde Temel Sosyalleşme İlkeleri'
    ]);

  if (jErr) {
    console.error('Error fetching jobs:', jErr);
    return;
  }

  for (const job of jobs || []) {
    console.log(`\n==================================================`);
    console.log(`İş Konusu: "${job.topic}"`);
    console.log(`İş ID: ${job.id}`);
    console.log(`İş Durumu: ${job.generation_status}`);
    console.log(`Aday Kaynak Sayısı: ${job.content_generation_job_sources?.length || 0}`);
    console.log(`==================================================`);

    (job.content_generation_job_sources || []).forEach((src, idx) => {
      console.log(`  [Kaynak ${idx + 1}]`);
      console.log(`  - Başlık: ${src.source_title}`);
      console.log(`  - Gerçek URL: ${src.source_url}`);
      console.log(`  - Yayıncı/Domain: ${src.publisher || 'Belirtilmedi'}`);
      console.log(`  - Kaynak Türü: ${src.source_type}`);
      console.log(`  - Konu İlgisi: ${src.source_excerpt}`);
      console.log(`  - Verification Status: ${src.verification_status}`);
    });
  }
}

reportPilotSources().catch(console.error);
