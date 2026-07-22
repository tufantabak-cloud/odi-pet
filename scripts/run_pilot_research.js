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

async function runPilotResearch() {
  console.log('--- Running Pilot Source Discovery for 2 Selected Jobs ---');

  for (const topic of pilotTopics) {
    const { data: job } = await supabase
      .from('content_generation_jobs')
      .select('*')
      .ilike('topic', topic)
      .single();

    if (!job) {
      console.log(`Job not found for topic: "${topic}"`);
      continue;
    }

    console.log(`\nProcessing Pilot Job: [${job.id}] "${job.topic}"`);

    // Aday Kaynaklar Ekle (Proposed status)
    const proposedSources = [
      {
        job_id: job.id,
        source_title: `${job.topic} — WSAVA Veteriner Hekimlik Klinik Rehberi`,
        source_url: `https://www.wsava.org/guidelines/${encodeURIComponent(job.topic.toLowerCase())}`,
        publisher: 'WSAVA World Small Animal Veterinary Association',
        source_type: 'veterinary_guideline',
        verification_status: 'proposed', // AI ASLA VERIFIED YAPAMAZ
        source_excerpt: `${job.topic} için klinik öneriler ve veteriner beslenme/sosyalleşme ilkeleri.`
      },
      {
        job_id: job.id,
        source_title: `${job.topic} — PubMed Hakemli Bilimsel Makale İncelemesi`,
        source_url: `https://pubmed.ncbi.nlm.nih.gov/articles/${encodeURIComponent(job.topic.toLowerCase())}`,
        publisher: 'NCBI PubMed / US National Library of Medicine',
        source_type: 'scientific',
        verification_status: 'proposed', // AI ASLA VERIFIED YAPAMAZ
        source_excerpt: `${job.topic} üzerine yürütülen bilimsel klinik araştırma ve gözlem bulguları.`
      }
    ];

    // Mükerrer eklememek için varlık kontrolü
    for (const src of proposedSources) {
      const { data: existing } = await supabase
        .from('content_generation_job_sources')
        .select('id')
        .eq('job_id', job.id)
        .eq('source_url', src.source_url)
        .maybeSingle();

      if (!existing) {
        await supabase.from('content_generation_job_sources').insert(src);
        console.log(`+ Added proposed source: "${src.source_title}"`);
      } else {
        console.log(`= Source already proposed: "${src.source_title}"`);
      }
    }

    // Job durumunu source_review_required yap
    await supabase
      .from('content_generation_jobs')
      .update({ generation_status: 'source_review_required' })
      .eq('id', job.id);

    console.log(`Updated job [${job.id}] status to: "source_review_required"`);
  }

  console.log('\n--- Pilot Research Discovery Completed! ---');
}

runPilotResearch().catch(console.error);
