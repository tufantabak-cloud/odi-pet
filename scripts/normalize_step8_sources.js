require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function normalizeStep8Sources() {
  console.log('=== Step 8.1: Normalizing Source Types & Linking PubMed References ===');

  const { data: dogArt } = await supabase
    .from('articles')
    .select('id, title')
    .ilike('title', '%Köpeklerde Temel Sosyalleşme%')
    .single();

  if (!dogArt) {
    console.error('Dog article not found!');
    return;
  }

  // 1. Fetch PMID 23018794 and PMID 30101101 from job sources
  const { data: pmidJobSources } = await supabase
    .from('content_generation_job_sources')
    .select('*')
    .eq('verification_status', 'verified');

  const targetPmids = ['23018794', '30101101'];

  for (const pmid of targetPmids) {
    const jobSource = (pmidJobSources || []).find((s) => s.source_url?.includes(pmid));
    if (!jobSource) continue;

    // Check if already in article_sources for this article
    const { data: existingArtSource } = await supabase
      .from('article_sources')
      .select('id')
      .eq('article_id', dogArt.id)
      .ilike('source_url', `%${pmid}%`)
      .maybeSingle();

    if (!existingArtSource) {
      const { data: inserted, error: insErr } = await supabase
        .from('article_sources')
        .insert([{
          article_id: dogArt.id,
          source_type: 'scientific',
          source_title: jobSource.source_title,
          source_url: jobSource.source_url,
          publisher: jobSource.publisher || 'NCBI PubMed',
          is_active: true
        }])
        .select();

      if (insErr) {
        console.error(`Error inserting PMID ${pmid}:`, insErr.message);
      } else {
        console.log(`+ Linked PMID ${pmid} to article_sources [${inserted[0]?.id}]`);
      }
    } else {
      console.log(`PMID ${pmid} already linked in article_sources [${existingArtSource.id}]`);
    }
  }

  // Canlı DB Kaynak Listesini Yazdır
  const { data: allSources } = await supabase
    .from('article_sources')
    .select('*')
    .eq('article_id', dogArt.id);

  console.log(`\nDog Article Sources (${allSources?.length || 0}):`);
  (allSources || []).forEach((s) => {
    console.log(`  - [${s.id}] Type: ${s.source_type} | Title: "${s.source_title}" | Active: ${s.is_active}`);
  });
}

normalizeStep8Sources().catch(console.error);
