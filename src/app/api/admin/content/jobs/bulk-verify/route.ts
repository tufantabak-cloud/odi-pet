import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { verifyJobSources, SourceConfirmationItem } from '@/lib/content/sourceVerificationService';

export const dynamic = 'force-dynamic';

export interface BulkJobItem {
  jobId: string;
  sources: SourceConfirmationItem[];
}

/**
 * POST /api/admin/content/jobs/bulk-verify
 * Batch verifies up to 10 jobs. Each job executes independently.
 */
export async function POST(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    const body = await req.json();
    const jobs: BulkJobItem[] = body.jobs;

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: 'Lütfen doğrulanacak iş listesini gönderin.' }, { status: 400 });
    }

    if (jobs.length > 10) {
      return NextResponse.json({ error: 'Toplu doğrulama tek seferde en fazla 10 iş için yapılabilir.' }, { status: 400 });
    }

    const results = [];

    for (const item of jobs) {
      try {
        if (!item.jobId || !Array.isArray(item.sources) || item.sources.length === 0) {
          results.push({
            jobId: item.jobId || 'unknown',
            status: 'skipped',
            error: 'Eksik veya geçersiz job/kaynak doğrulama verisi.'
          });
          continue;
        }

        const res = await verifyJobSources(supabase, item.jobId, item.sources, actor.id);
        results.push({
          jobId: item.jobId,
          status: res.pipelineStatus || (res.success ? 'verified' : 'failed'),
          verified_source_count: res.verified_source_count,
          required_source_count: res.required_source_count,
          articleId: res.articleId || null,
          error: res.error || null
        });
      } catch (err: any) {
        results.push({
          jobId: item.jobId,
          status: 'failed',
          error: err.message || 'İşlem başarısız.'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Geçersiz istek.' }, { status: 500 });
  }
}
