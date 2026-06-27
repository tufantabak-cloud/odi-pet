import { createClient } from '@supabase/supabase-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://soautcxgiqhxiaxrubxv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function run() {
  console.log("Adding columns cover_url and cover_position to pets table...");
  const { data, error } = await supabase.rpc('alter_table_add_cover_columns');
  
  if (error) {
    console.log("RPC call failed, attempting direct query via postgres function injection...");
    // Let's create a temporary SQL executor function or run direct migrations via RPC
    const sql = `
      ALTER TABLE public.pets 
      ADD COLUMN IF NOT EXISTS cover_url TEXT,
      ADD COLUMN IF NOT EXISTS cover_position TEXT DEFAULT 'center';
    `;
    
    // We can inject a postgres function to execute this SQL and drop it
    const initSql = `
      CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    console.log("Please create the helper exec_sql function in Supabase dashboard to execute ALTER queries, or check connection.");
    console.error(error);
  } else {
    console.log("Migration executed successfully!");
  }
}

run();
