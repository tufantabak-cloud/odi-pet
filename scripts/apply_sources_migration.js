require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- Applying Article Sources & RPC Migration ---');
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260722130000_article_sources_and_atomicity.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // PL/pgSQL fonksiyon bloklarını koruyarak ayır
  const statements = [];
  let current = [];
  let inFunction = false;

  const lines = sqlContent.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('CREATE OR REPLACE FUNCTION')) {
      inFunction = true;
    }
    current.push(line);
    if (inFunction && line.trim().startsWith('$$;')) {
      inFunction = false;
      statements.push(current.join('\n'));
      current = [];
    } else if (!inFunction && line.trim().endsWith(';')) {
      statements.push(current.join('\n'));
      current = [];
    }
  }
  if (current.length > 0 && current.join('').trim()) {
    statements.push(current.join('\n'));
  }

  for (const stmt of statements) {
    throw new Error('SECURITY_NOTICE: RPC execute_ddl HAS BEEN REMOVED FOR SECURITY REASONS. Please use Supabase CLI (`npx supabase db push` or `npx supabase migration`) or standard direct migration execution to apply DDL.');
  }

  console.log('--- Verifying Schema & RPC Updates ---');
  const { data: sources, error: srcErr } = await supabase
    .from('article_sources')
    .select('id')
    .limit(1);

  if (srcErr) {
    console.error('Article Sources Table Verification Error:', srcErr);
  } else {
    console.log('Article Sources Table Verified Successfully!');
  }
}

run().catch(console.error);
