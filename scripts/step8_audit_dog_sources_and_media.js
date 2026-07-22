require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function auditDogSourcesAndMedia() {
  console.log('=== Step 8: Detailed Audit of Dog Article Sources & Media ===');

  const { data: dogArt } = await supabase
    .from('articles')
    .select('id, title, is_published, vet_review_status')
    .ilike('title', '%Köpeklerde Temel Sosyalleşme%')
    .single();

  console.log('Dog Article:', dogArt);

  // 1. Article Sources
  const { data: sources } = await supabase
    .from('article_sources')
    .select('*')
    .eq('article_id', dogArt.id)
    .order('created_at', { ascending: true });

  console.log(`\n--- Article Sources (${sources?.length || 0}) ---`);
  (sources || []).forEach((s, i) => {
    console.log(`[${i + 1}] ID: ${s.id}`);
    console.log(`    Type: ${s.source_type} | Name: "${s.source_name || s.publisher}"`);
    console.log(`    Title: "${s.source_title}"`);
    console.log(`    URL: ${s.source_url}`);
    console.log(`    Status: ${s.verification_status} | Active: ${s.is_active} | Display: ${s.display_in_article ?? true}`);
  });

  // 2. Article Media
  const { data: media } = await supabase
    .from('article_media')
    .select('*')
    .eq('article_id', dogArt.id)
    .order('created_at', { ascending: true });

  console.log(`\n--- Article Media (${media?.length || 0}) ---`);
  (media || []).forEach((m, i) => {
    console.log(`[${i + 1}] ID: ${m.id}`);
    console.log(`    Type: ${m.media_type} | Rights: ${m.rights_status} | Active: ${m.is_active}`);
    console.log(`    AltText: "${m.alt_text}"`);
    console.log(`    Caption: "${m.caption || 'Yok'}"`);
    console.log(`    RightsNote: "${m.rights_note || 'Yok'}"`);
    console.log(`    URL: ${m.external_url || m.storage_path}`);
  });

  // 3. Overall Articles & Jobs Count
  const { count: articlesCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true });

  const { count: jobsCount } = await supabase
    .from('content_generation_jobs')
    .select('id', { count: 'exact', head: true });

  console.log(`\n--- System Counts ---`);
  console.log(`Total Articles: ${articlesCount}`);
  console.log(`Total Jobs: ${jobsCount}`);
}

auditDogSourcesAndMedia().catch(console.error);
