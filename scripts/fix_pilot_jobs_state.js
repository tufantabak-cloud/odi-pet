require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixPilotJobsState() {
  console.log('=== Updating Jobs with Exact Compatible DB Values ===');

  const { data: dogArt } = await supabase
    .from('articles')
    .select('id')
    .ilike('title', '%Köpeklerde Temel Sosyalleşme%')
    .single();

  const { data: catArt } = await supabase
    .from('articles')
    .select('id')
    .ilike('title', '%Kedilerde Sıvı Alımı%')
    .single();

  // Köpek İşini Güncelle
  const { data: dogJob, error: dogErr } = await supabase
    .from('content_generation_jobs')
    .update({
      job_type: 'update_content',
      article_id: dogArt.id,
      generation_status: 'imported',
      last_error: null
    })
    .eq('id', '9b3a1986-6067-4746-9b7d-502816de196f')
    .select();

  if (dogErr) console.error('Dog Job Error:', dogErr);
  else console.log('+ Dog Job Updated:', dogJob[0]?.id, 'status:', dogJob[0]?.generation_status, 'article_id:', dogJob[0]?.article_id);

  // Kedi İşini Güncelle
  const { data: catJob, error: catErr } = await supabase
    .from('content_generation_jobs')
    .update({
      job_type: 'update_content',
      article_id: catArt.id,
      generation_status: 'imported',
      last_error: null
    })
    .eq('id', 'a3a93629-81b0-4610-a653-96e8bf15582b')
    .select();

  if (catErr) console.error('Cat Job Error:', catErr);
  else console.log('+ Cat Job Updated:', catJob[0]?.id, 'status:', catJob[0]?.generation_status, 'article_id:', catJob[0]?.article_id);

  // Canlı DB Kontrolü
  const { count: importedCount } = await supabase
    .from('content_generation_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('generation_status', 'imported');

  console.log(`\nImported Jobs Count in DB: ${importedCount || 0}`);
}

fixPilotJobsState();
