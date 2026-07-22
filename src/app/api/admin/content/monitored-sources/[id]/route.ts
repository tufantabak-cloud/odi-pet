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
 * Kaynağı silme
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

  const { error } = await supabase
    .from('monitored_sources')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Kaynak silindi.' });
}
