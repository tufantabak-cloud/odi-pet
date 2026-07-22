require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function readOnlyDbAudit() {
  console.log('=== Step 1: READ-ONLY Live DB Audit ===');

  const { count: articlesCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true });

  const { count: jobsCount } = await supabase
    .from('content_generation_jobs')
    .select('id', { count: 'exact', head: true });

  const { count: sourcesCount } = await supabase
    .from('content_generation_job_sources')
    .select('id', { count: 'exact', head: true });

  const { count: articleSourcesCount } = await supabase
    .from('article_sources')
    .select('id', { count: 'exact', head: true });

  console.log(`articles_count: ${articlesCount || 0}`);
  console.log(`jobs_count: ${jobsCount || 0}`);
  console.log(`sources_count: ${sourcesCount || 0}`);
  console.log(`article_sources_count: ${articleSourcesCount || 0}`);

  console.log('\n--- Articles List ---');
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, is_published, vet_review_status')
    .order('created_at', { ascending: false });

  (articles || []).forEach((a, i) => {
    console.log(`[${i + 1}] ID: ${a.id} | Slug: /${a.slug} | Published: ${a.is_published} | VetStatus: ${a.vet_review_status} | Title: "${a.title}"`);
  });

  console.log('\n--- Content Generation Jobs List ---');
  const { data: jobs } = await supabase
    .from('content_generation_jobs')
    .select('id, topic, job_type, generation_status, article_id, last_error')
    .order('created_at', { ascending: false });

  (jobs || []).forEach((j, i) => {
    console.log(`[${i + 1}] JobID: ${j.id} | Type: ${j.job_type} | Status: ${j.generation_status} | ArticleID: ${j.article_id || 'null'} | Topic: "${j.topic}"`);
  });
}

readOnlyDbAudit().catch(console.error);
