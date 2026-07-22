import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content/[id]/sources
 * Makaleye ait kaynakları getirir.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { id: articleId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: sources, error } = await supabase
    .from('article_sources')
    .select('*')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(sources || []);
}

/**
 * POST /api/admin/content/[id]/sources
 * Makaleye yeni kaynak ekler.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { id: articleId } = await params;
  const supabase = await createServerSupabaseClient();

  try {
    const body = await req.json();
    const { source_title, source_url, publisher, source_type, published_at } = body;

    if (!source_title) {
      return NextResponse.json({ error: 'Kaynak başlığı zorunludur.' }, { status: 400 });
    }

    const sType = source_type || 'scientific';
    const validTypes = ['official', 'veterinary_guideline', 'scientific', 'manufacturer', 'reputable_editorial'];
    if (!validTypes.includes(sType)) {
      return NextResponse.json({ error: 'Geçersiz kaynak türü.' }, { status: 400 });
    }

    const { data: newSource, error: insertErr } = await supabase
      .from('article_sources')
      .insert({
        article_id: articleId,
        source_title: source_title.trim(),
        source_url: source_url ? source_url.trim() : null,
        publisher: publisher ? publisher.trim() : null,
        source_type: sType,
        published_at: published_at || null,
        checked_at: new Date().toISOString(),
        is_active: true,
        created_by: actor.id
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json(newSource, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Geçersiz istek.' }, { status: 400 });
  }
}
