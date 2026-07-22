require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function invalidateUnprovenVerifications() {
  console.log('=== Step 1 & 2: Resetting ALL Job Sources to Proposed (Purge & Re-insert) ===');

  const { data: sources } = await supabase
    .from('content_generation_job_sources')
    .select('*');

  if (sources && sources.length > 0) {
    for (const src of sources) {
      await supabase
        .from('content_generation_job_sources')
        .delete()
        .eq('id', src.id);

      delete src.id;
      delete src.created_at;
      src.verification_status = 'proposed';
      src.verified_by = null;
      src.verified_at = null;
      src.rejection_reason = null;

      await supabase.from('content_generation_job_sources').insert(src);
    }
  }

  const { data: jobs } = await supabase.from('content_generation_jobs').select('id');
  if (jobs && jobs.length > 0) {
    const jobIds = jobs.map((j) => j.id);
    await supabase
      .from('content_generation_jobs')
      .update({
        generation_status: 'source_review_required',
        generated_draft: null,
        generated_at: null,
        last_error: 'draft_invalidated_unproven_human_verification'
      })
      .in('id', jobIds);
  }

  const { count: verifiedCount } = await supabase
    .from('content_generation_job_sources')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified');

  const { count: draftCount } = await supabase
    .from('content_generation_jobs')
    .select('id', { count: 'exact', head: true })
    .not('generated_draft', 'is', null);

  const { count: articlesCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true });

  console.log(`\nCanlı DB Verified Kaynak Sayısı: ${verifiedCount || 0}`);
  console.log(`Canlı DB generated_draft Sayısı: ${draftCount || 0}`);
  console.log(`Canlı DB Articles Kayıt Sayısı: ${articlesCount || 0}`);
}

invalidateUnprovenVerifications().catch(console.error);
