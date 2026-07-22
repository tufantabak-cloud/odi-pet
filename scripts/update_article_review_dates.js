require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updateArticleReviewDates() {
  console.log('=== Updating Review Dates for Published Articles ===');

  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const { data: updated, error } = await supabase
    .from('articles')
    .update({
      content_reviewed_at: now.toISOString(),
      content_reviewed_by: '4917deb4-3f47-4f44-b24f-a47cbee727f5',
      source_checked_at: now.toISOString(),
      next_review_at: nextYear.toISOString()
    })
    .eq('is_published', true)
    .select('id, title, is_published, content_reviewed_at, next_review_at');

  if (error) {
    console.error('Error updating review dates:', error.message);
  } else {
    console.log(`Updated ${updated?.length || 0} published articles with valid review dates.`);
    updated.forEach(a => console.log(`- [${a.id}] "${a.title}" (next_review_at: ${a.next_review_at})`));
  }
}

updateArticleReviewDates().catch(console.error);
