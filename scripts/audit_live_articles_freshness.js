require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function audit() {
  console.log('--- Auditing Live Articles Freshness Status ---');
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, slug, is_published, is_medical_content, vet_review_status, content_reviewed_at, next_review_at, archived_at');

  if (error) {
    console.error('Audit Error:', error);
    return;
  }

  const now = new Date();
  const unreviewedPublished = [];
  const validPublished = [];

  for (const art of articles || []) {
    if (!art.is_published || art.archived_at) continue;

    const isFresh =
      art.content_reviewed_at &&
      art.next_review_at &&
      new Date(art.next_review_at) >= now;

    const isVetApproved = !art.is_medical_content || art.vet_review_status === 'approved';

    if (!isFresh || !isVetApproved) {
      unreviewedPublished.push(art);
    } else {
      validPublished.push(art);
    }
  }

  console.log(`Total Live Articles in DB: ${articles.length}`);
  console.log(`Eligible & Fresh Published Articles for Users: ${validPublished.length}`);
  console.log(`Incomplete/Unreviewed Published Articles (Safely Isolated from Users): ${unreviewedPublished.length}`);

  if (unreviewedPublished.length > 0) {
    console.log('\n--- Isolated Unreviewed Articles List ---');
    unreviewedPublished.forEach((a, i) => {
      console.log(`${i + 1}. [${a.id}] "${a.title}" (Medical: ${a.is_medical_content}, Vet: ${a.vet_review_status}, NextReview: ${a.next_review_at})`);
    });
  }
}

audit().catch(console.error);
