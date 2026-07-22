require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTablesExist() {
  const { data: sources, error: srcErr } = await supabase.from('article_sources').select('*').limit(1);
  console.log('article_sources schema:', sources, srcErr?.message);

  const { data: media, error: mediaErr } = await supabase.from('article_media').select('*').limit(1);
  console.log('article_media schema:', media, mediaErr?.message);
}

checkTablesExist();
