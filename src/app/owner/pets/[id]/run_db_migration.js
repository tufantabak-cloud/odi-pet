const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Applying column updates using RPC connection...");
  
  // First attempt: Create a generic DDL executor
  const ddlHelperSql = `
    CREATE OR REPLACE FUNCTION public.execute_ddl(ddl text)
    RETURNS void AS $$
    BEGIN
      EXECUTE ddl;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  const alterPetsSql = `
    ALTER TABLE public.pets 
    ADD COLUMN IF NOT EXISTS cover_url TEXT,
    ADD COLUMN IF NOT EXISTS cover_position TEXT DEFAULT 'center';
  `;

  // We can try to use a postgres query or execute DDL if execute_ddl function already exists,
  // or we can invoke SQL directly using the REST interface if possible.
  // Since we have the service role key, we can try to call execute_ddl.
  try {
    const { error: err } = await supabase.rpc('execute_ddl', { ddl: alterPetsSql });
    if (err) {
      console.log("RPC execute_ddl failed, probably doesn't exist yet.", err.message);
      console.log("Since Supabase REST RPC requires the function to exist, you should execute this SQL query in your Supabase SQL Editor Dashboard:");
      console.log("\n========================================");
      console.log(alterPetsSql.trim());
      console.log("========================================\n");
    } else {
      console.log("Database columns cover_url and cover_position successfully added!");
    }
  } catch (ex) {
    console.error("Execution failed:", ex);
  }
}

run();
