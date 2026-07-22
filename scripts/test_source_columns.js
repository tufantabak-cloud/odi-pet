require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testSourceColumns() {
  const { data: job } = await supabase.from('content_generation_jobs').select('id').limit(1).single();

  const sample = {
    job_id: job.id,
    source_title: 'Test Title',
    source_url: 'https://pubmed.ncbi.nlm.nih.gov/22005408/',
    publisher: 'PubMed',
    source_type: 'scientific',
    verification_status: 'verified',
    verified_by: '4917deb4-3f47-4f44-b24f-a47cbee727f5',
    verified_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('content_generation_job_sources').insert(sample).select();
  console.log('Inserted basic source:', data, error);
}

testSourceColumns();
