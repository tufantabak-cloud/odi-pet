require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testArticleInsert() {
  const sample = {
    title: 'Test Article',
    slug: 'test-article-slug',
    content: 'Test content body',
    category: 'genel',
    is_published: false
  };

  const { data, error } = await supabase.from('articles').insert(sample).select();
  console.log('Inserted article sample:', data, error);
}

testArticleInsert();
