require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testAdminApiPayload() {
  console.log('=== Step 6: DB vs API Server Payload Verification ===');

  const { data: articles, count: artCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact' });

  const { data: jobs, count: jobsCount } = await supabase
    .from('content_generation_jobs')
    .select('*, content_generation_job_sources(*)', { count: 'exact' });

  console.log(`DB Articles Count: ${artCount || 0} | Array Length: ${articles?.length || 0}`);
  console.log(`DB Jobs Count: ${jobsCount || 0} | Array Length: ${jobs?.length || 0}`);

  console.log('\nArticles Payload Sample:');
  (articles || []).forEach((a) => console.log(`  - [${a.id}] "${a.title}" (is_published: ${a.is_published})`));

  console.log('\nJobs Payload Sample (First 3):');
  (jobs || []).slice(0, 3).forEach((j) => console.log(`  - [${j.id}] "${j.topic}" (status: ${j.generation_status}, sources: ${j.content_generation_job_sources?.length || 0})`));
}

testAdminApiPayload().catch(console.error);
