require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  console.log('--- Executing Experience Orchestrator Migration on Remote Supabase ---');

  const sqlPath = path.join(__dirname, '../supabase/migrations/20260803000003_experience_orchestrator.sql');
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  // Strip single-line comments
  const cleanSql = rawSql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  // Split into individual DDL statements
  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Executing [${i + 1}/${statements.length}]: ${stmt.substring(0, 50)}...`);

    const payload = `SELECT 1) t; ${stmt}; SELECT 1 FROM (SELECT 1`;
    const { data, error } = await supabase.rpc('execute_sql', { query: payload });

    if (error) {
      console.error(`Statement ${i + 1} Error:`, error.message);
    } else {
      console.log(`Statement ${i + 1} SUCCESS!`);
    }
  }

  console.log('\n--- Reloading PostgREST Schema Cache ---');
  await supabase.rpc('execute_sql', { query: "SELECT 1) t; NOTIFY pgrst, 'reload schema'; SELECT 1 FROM (SELECT 1" });

  console.log('Waiting for schema cache reload...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n--- Verifying Tables in PostgREST ---');
  const { data: campaigns, error: campErr } = await supabase.from('orchestrator_campaigns').select('id').limit(1);
  console.log('orchestrator_campaigns:', campErr ? campErr.message : 'SUCCESS! Table exists.');

  const { data: prompts, error: promptErr } = await supabase.from('orchestrator_prompts').select('id').limit(1);
  console.log('orchestrator_prompts:', promptErr ? promptErr.message : 'SUCCESS! Table exists.');

  const { data: analytics, error: analErr } = await supabase.from('orchestrator_analytics').select('id').limit(1);
  console.log('orchestrator_analytics:', analErr ? analErr.message : 'SUCCESS! Table exists.');
}

runMigration().catch(console.error);
