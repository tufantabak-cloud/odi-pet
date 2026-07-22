require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectSchema() {
  const { data: cols } = await supabase.rpc('execute_sql', { query: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'articles';` });
  console.log('Articles Columns:', cols);
}

inspectSchema();
