import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { createContentJob } from '@/lib/agents/aiContentAgent';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content/jobs
 * AI Taslak İşlerini listeler.
 */
export async function GET(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: jobs, error } = await supabase
    .from('content_generation_jobs')
    .select('*, content_generation_job_sources(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: jobs || [], totalCount: jobs?.length || 0 });
}

/**
 * POST /api/admin/content/jobs
 * Yeni AI içerik üretim veya güncelleme işi oluşturur.
 */
export async function POST(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    const body = await req.json();
    const result = await createContentJob(supabase, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Geçersiz istek.' }, { status: 400 });
  }
}
