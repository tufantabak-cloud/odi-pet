require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'articles'` });
  if (error) console.error('Error:', error);
  else console.log('Existing Articles Columns:', data);
}

check();
