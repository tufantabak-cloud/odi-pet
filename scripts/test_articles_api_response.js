require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testArticlesApiResponse() {
  console.log('=== Checking Articles API Response Match ===');

  const { data, count } = await supabase
    .from('articles')
    .select('*', { count: 'exact' });

  const apiPayload = {
    articles: data || [],
    data: data || [],
    totalCount: count || 0
  };

  console.log(`DB Articles Count: ${count}`);
  console.log(`Payload articles.length: ${apiPayload.articles.length}`);
  console.log(`Payload data.length: ${apiPayload.data.length}`);

  // Simulating Client Parsing:
  const clientParsedArticles = apiPayload.articles || apiPayload.data || (Array.isArray(apiPayload) ? apiPayload : []);
  console.log(`Client Parsed Articles Length: ${clientParsedArticles.length}`);

  (clientParsedArticles || []).forEach((a) => {
    console.log(`  - [${a.id}] "${a.title}" (published: ${a.is_published})`);
  });
}

testArticlesApiResponse();
