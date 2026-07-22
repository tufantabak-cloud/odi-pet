require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function step8ReadOnlyAudit() {
  console.log('=== Step 8: Read-Only Audit of Tables & Storage Buckets ===');

  // 1. article_sources
  const { data: artSources, error: artSrcErr } = await supabase
    .from('article_sources')
    .select('*')
    .limit(5);

  console.log('article_sources schema sample:', artSources, artSrcErr);

  // 2. Storage Buckets
  const { data: buckets, error: bucketErr } = await supabase
    .storage
    .listBuckets();

  console.log('Storage Buckets:', buckets?.map((b) => b.name), bucketErr);

  // 3. article_media table check
  const { data: media, error: mediaErr } = await supabase
    .from('article_media')
    .select('*')
    .limit(1);

  console.log('article_media check:', media, mediaErr?.message);
}

step8ReadOnlyAudit();
