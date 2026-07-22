require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkLiveDbArticles() {
  console.log('=== Checking Live DB Articles & Review Dates ===');

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, slug, is_published, vet_review_status, content_reviewed_at, content_reviewed_by, source_checked_at, next_review_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error.message);
    return;
  }

  console.log(`Total Articles in DB: ${articles.length}`);
  articles.forEach((a, i) => {
    console.log(`\n[${i + 1}] ID: ${a.id}`);
    console.log(`    Title: "${a.title}"`);
    console.log(`    Slug: ${a.slug}`);
    console.log(`    is_published: ${a.is_published}`);
    console.log(`    vet_review_status: ${a.vet_review_status}`);
    console.log(`    content_reviewed_at: ${a.content_reviewed_at}`);
    console.log(`    next_review_at: ${a.next_review_at}`);
  });

  const { count: jobCount } = await supabase.from('content_generation_jobs').select('id', { count: 'exact', head: true });
  const { count: srcCount } = await supabase.from('content_generation_job_sources').select('id', { count: 'exact', head: true });

  console.log(`\nJob Count: ${jobCount || 0}, Sources Count: ${srcCount || 0}`);
}

checkLiveDbArticles().catch(console.error);
