require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- Applying Content Generation Jobs Migration (Whole DDL) ---');
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260722140000_content_generation_jobs.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Direct SQL Statements
  const statements = [
    `CREATE TABLE IF NOT EXISTS content_generation_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_type text NOT NULL CHECK (job_type IN ('new_content', 'update_content')),
      article_id uuid REFERENCES articles(id) ON DELETE SET NULL,
      topic text NOT NULL,
      generation_status text NOT NULL DEFAULT 'queued' 
        CHECK (generation_status IN (
          'queued', 'research_required', 'source_review_required', 'ready_for_generation', 
          'generating', 'draft_ready', 'admin_review_required', 'vet_review_required', 
          'approved_for_import', 'imported', 'rejected', 'failed'
        )),
      generated_draft jsonb,
      proposed_targeting jsonb,
      change_summary text,
      generated_by text DEFAULT 'ai_content_agent',
      model_name text DEFAULT 'gemini-1.5-flash',
      prompt_version integer DEFAULT 1,
      generation_attempts integer DEFAULT 0,
      last_error text,
      generated_at timestamptz,
      reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      rejection_reason text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );`,

    `CREATE TABLE IF NOT EXISTS content_generation_job_sources (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id uuid NOT NULL REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
      source_title text NOT NULL,
      source_url text,
      publisher text,
      source_type text NOT NULL DEFAULT 'scientific',
      published_at timestamptz,
      checked_at timestamptz DEFAULT now(),
      verification_status text NOT NULL DEFAULT 'proposed'
        CHECK (verification_status IN ('proposed', 'verified', 'rejected')),
      verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
      verified_at timestamptz,
      source_excerpt text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );`,

    `ALTER TABLE content_generation_job_sources ENABLE ROW LEVEL SECURITY;`
  ];

  for (const stmt of statements) {
    throw new Error('SECURITY_NOTICE: RPC execute_ddl HAS BEEN REMOVED FOR SECURITY REASONS. Please use Supabase CLI (`npx supabase db push` or `npx supabase migration`) or standard direct migration execution to apply DDL.');
  }

  console.log('--- Verifying Jobs & Sources Tables ---');
  const { data: jobs, error: jobErr } = await supabase.from('content_generation_jobs').select('id').limit(1);
  console.log('Jobs verification:', jobErr || 'Verified Successfully!');

  const { data: sources, error: srcErr } = await supabase.from('content_generation_job_sources').select('id').limit(1);
  console.log('Job sources verification:', srcErr || 'Verified Successfully!');
}

run().catch(console.error);
