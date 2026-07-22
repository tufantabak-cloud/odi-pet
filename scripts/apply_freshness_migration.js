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
  console.log('--- Applying Content Freshness & Revisions Migration ---');
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260722120000_content_freshness_and_revisions.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Statements'a böl ve son noktalı virgülleri temizle
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    const cleanStmt = stmt.replace(/;$/, '');
    console.log('Executing:', cleanStmt.substring(0, 60) + '...');
    const { error } = await supabase.rpc('execute_ddl', { ddl: cleanStmt });
    if (error) {
      console.error('DDL Error:', error);
    }
  }

  console.log('--- Verifying Schema Updates ---');
  const { data: cols, error: colErr } = await supabase
    .from('articles')
    .select('freshness_type, review_interval_days, next_review_at, content_version, archived_at')
    .limit(1);

  if (colErr) {
    console.error('Articles Columns Verification Error:', colErr);
  } else {
    console.log('Articles Columns Verified Successfully!');
  }

  const { data: revs, error: revErr } = await supabase
    .from('article_revisions')
    .select('id')
    .limit(1);

  if (revErr) {
    console.error('Article Revisions Table Verification Error:', revErr);
  } else {
    console.log('Article Revisions Table Verified Successfully!');
  }
}

run().catch(console.error);
