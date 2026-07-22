import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * PATCH /api/admin/content/monitored-sources/[id]
 * Kaynak güncelleme (is_active, processing_mode vb.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const body = await req.json();

  const updates: any = {};
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
  if (body.processing_mode && ['admin_review', 'draft_only'].includes(body.processing_mode)) {
    updates.processing_mode = body.processing_mode;
  }
  if (body.species_scope && ['cat', 'dog', 'both'].includes(body.species_scope)) {
    updates.species_scope = body.species_scope;
  }
  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('monitored_sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/admin/content/monitored-sources/[id]
 * Kaynağı ve isteğe bağlı olarak tamamlanmamış bağlı işleri güvenli bir şekilde siler (soft delete).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  try {
    const url = new URL(req.url);
    const deleteJobs = url.searchParams.get('delete_jobs') === 'true';

    // 1. Bağlı tamamlanmamış işleri temizle (Seçenek B)
    if (deleteJobs) {
      // Discovered external content'lerden job_id'leri bul
      const { data: discItems } = await supabase
        .from('discovered_external_contents')
        .select('job_id')
        .eq('source_id', id);

      const jobIds = (discItems || []).map(d => d.job_id).filter(Boolean);

      if (jobIds.length > 0) {
        // İthal edilmemiş veya makaleye bağlanmamış işleri soft delete yap
        await supabase
          .from('content_generation_jobs')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: actor.id,
            delete_reason: 'Bağlı kaynak silindi'
          })
          .in('id', jobIds)
          .is('article_id', null)
          .neq('generation_status', 'imported')
          .neq('generation_status', 'published');
      }
    }

    // 2. Kaynak kaydını soft delete yap / pasifleştir
    const { error } = await supabase
      .from('monitored_sources')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: actor.id,
        delete_reason: deleteJobs ? 'Kaynak ve tamamlanmamış işler silindi' : 'Yalnız kaynak silindi'
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Kaynak başarıyla silindi.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sunucu hatası.' }, { status: 500 });
  }
}
