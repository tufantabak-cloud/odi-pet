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
  console.log('--- Applying Atomic Verification RPC Migration ---');
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260722170000_verify_job_source_atomic.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Statements split by blank lines or execute as whole if possible
  const statements = [
    `ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS source_job_id UUID REFERENCES public.content_generation_jobs(id) ON DELETE SET NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_source_job_id ON public.articles(source_job_id) WHERE source_job_id IS NOT NULL`,
    `ALTER TABLE public.content_source_verification_audits ADD COLUMN IF NOT EXISTS source_version_hash TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_audits_idempotency ON public.content_source_verification_audits(job_id, source_id, source_version_hash, action)`,
    `CREATE OR REPLACE FUNCTION public.verify_job_source_atomic(
      p_job_id uuid,
      p_source_id uuid,
      p_action text,
      p_confirmed_title_url boolean DEFAULT false,
      p_confirmed_relevance boolean DEFAULT false,
      p_rejection_reason text DEFAULT NULL
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_actor_id uuid;
      v_actor_role text;
      v_src RECORD;
      v_job RECORD;
      v_version_hash text;
      v_verified_count int;
      v_required_count int;
      v_is_medical boolean;
      v_category text;
    BEGIN
      v_actor_id := auth.uid();
      IF v_actor_id IS NULL OR v_actor_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
        RAISE EXCEPTION 'Geçersiz veya sahte kullanıcı oturumu.';
      END IF;

      SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
      IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'founder') THEN
        RAISE EXCEPTION 'Kaynak doğrulama yalnız yetkili admin veya founder profilleri tarafından yapılabilir.';
      END IF;

      IF p_action NOT IN ('verified', 'rejected') THEN
        RAISE EXCEPTION 'Geçersiz doğrulama aksiyonu.';
      END IF;

      IF p_action = 'verified' AND (p_confirmed_title_url IS NOT TRUE OR p_confirmed_relevance IS NOT TRUE) THEN
        RAISE EXCEPTION 'Doğrulama öncesinde iki onay kutusu da işaretlenmiş olmalıdır.';
      END IF;

      SELECT * INTO v_src FROM public.content_generation_job_sources
      WHERE id = p_source_id AND job_id = p_job_id FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Kaynak bulunamadı.';
      END IF;

      SELECT * INTO v_job FROM public.content_generation_jobs
      WHERE id = p_job_id FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'İş kaydı bulunamadı.';
      END IF;

      v_version_hash := md5(coalesce(v_src.source_title, '') || ':' || coalesce(v_src.source_url, ''));

      UPDATE public.content_generation_job_sources
      SET verification_status = p_action,
          verified_by = CASE WHEN p_action = 'verified' THEN v_actor_id ELSE NULL END,
          verified_at = CASE WHEN p_action = 'verified' THEN now() ELSE NULL END,
          updated_at = now()
      WHERE id = p_source_id;

      INSERT INTO public.content_source_verification_audits (
        job_id,
        source_id,
        actor_id,
        actor_role,
        action,
        confirmed_title_url,
        confirmed_relevance,
        source_version_hash,
        created_at
      )
      VALUES (
        p_job_id,
        p_source_id,
        v_actor_id,
        v_actor_role,
        p_action,
        COALESCE(p_confirmed_title_url, false),
        COALESCE(p_confirmed_relevance, false),
        v_version_hash,
        now()
      )
      ON CONFLICT (job_id, source_id, source_version_hash, action) DO NOTHING;

      v_category := COALESCE(v_job.generated_draft->>'category', 'egitim');
      v_is_medical := (v_job.generated_draft->>'is_medical_content')::boolean IS TRUE OR v_category IN ('saglik', 'beslenme');
      
      v_required_count := COALESCE(v_job.required_source_count, CASE WHEN v_is_medical THEN 2 ELSE 1 END);

      SELECT count(*)::int INTO v_verified_count
      FROM public.content_generation_job_sources s
      WHERE s.job_id = p_job_id
        AND s.verification_status = 'verified'
        AND s.source_url IS NOT NULL;

      RETURN jsonb_build_object(
        'success', true,
        'job_id', p_job_id,
        'source_id', p_source_id,
        'action', p_action,
        'verified_source_count', v_verified_count,
        'required_source_count', v_required_count
      );
    END;
    $$`
  ];

  for (const stmt of statements) {
    const { error } = await supabase.rpc('execute_ddl', { ddl: stmt.replace(/;$/, '') });
    if (error) console.error('DDL Error:', error);
    else console.log('Successfully executed statement!');
  }

  console.log('Migration completed successfully!');
}

run().catch(console.error);
