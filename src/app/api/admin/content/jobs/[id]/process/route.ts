import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { processJobPipeline } from '@/lib/content/jobPipelineService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/jobs/[id]/process
 * İşi araştırmadan makale taslağına kadar uçtan uca çalıştırır.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { id: jobId } = await params;
  const supabase = await createServerSupabaseClient();

  try {
    const body = await req.json().catch(() => ({}));
    const { category, speciesScope, isMedicalContent } = body;

    const result = await processJobPipeline(supabase, jobId, actor.id, {
      category,
      speciesScope,
      isMedicalContent
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Job Process Error:', err);
    return NextResponse.json({ error: err.message || 'İşlem sırasında hata oluştu.' }, { status: 500 });
  }
}
