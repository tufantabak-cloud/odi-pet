import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

const VALID_MEDIA_TYPES = ['featured_image', 'content_image', 'gallery_image'];
const VALID_RIGHTS_STATUSES = ['owned', 'licensed', 'permission_granted', 'public_domain', 'embed_only', 'unknown'];

/**
 * GET /api/admin/content/media?article_id=<ARTICLE_ID>
 * Makale görsellerini listeler.
 */
export async function GET(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get('article_id');

  if (!articleId) {
    return NextResponse.json({ error: 'article_id gereklidir.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Check if article_media table exists safely
  const { data: media, error } = await supabase
    .from('article_media')
    .select('*')
    .eq('article_id', articleId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error && error.code !== 'PGRST116') {
    // If table not created yet, return empty list gracefully
    return NextResponse.json({ media: [] });
  }

  return NextResponse.json({ media: media || [] });
}

/**
 * POST /api/admin/content/media
 * Makaleye kapak, içerik içi veya galeri görseli ekler.
 */
export async function POST(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    const body = await req.json();
    const {
      article_id,
      media_type,
      external_url,
      storage_path,
      alt_text,
      caption,
      source_name,
      source_url,
      rights_status,
      rights_note,
      display_order = 0
    } = body;

    if (!article_id || !media_type || !alt_text?.trim()) {
      return NextResponse.json({ error: 'article_id, media_type ve alt_text zorunludur.' }, { status: 400 });
    }

    if (!VALID_MEDIA_TYPES.includes(media_type)) {
      return NextResponse.json({ error: `Geçersiz medya türü: ${media_type}` }, { status: 400 });
    }

    if (!rights_status || !VALID_RIGHTS_STATUSES.includes(rights_status)) {
      return NextResponse.json({ error: 'Görsel telif / kullanım hakları durumu zorunludur.' }, { status: 400 });
    }

    if (rights_status === 'unknown') {
      return NextResponse.json({ error: 'Telif/kullanım hakkı "unknown" (bilinmiyor) olan görseller yayınlanamaz veya eklenemez.' }, { status: 400 });
    }

    const payload = {
      article_id,
      media_type,
      external_url: external_url || null,
      storage_path: storage_path || null,
      alt_text: alt_text.trim(),
      caption: caption || null,
      source_name: source_name || null,
      source_url: source_url || null,
      rights_status,
      rights_note: rights_note || null,
      display_order: Number(display_order) || 0,
      is_active: true,
      created_by: actor.id
    };

    const { data: newMedia, error } = await supabase
      .from('article_media')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ media: newMedia, message: 'Görsel başarıyla eklendi.' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Geçersiz görsel verisi.' }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/content/media
 * Görsel bilgilerini (alt_text, caption, rights_status, display_order) günceller veya makaleden kaldırır.
 */
export async function PATCH(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    const body = await req.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Görsel id gereklidir.' }, { status: 400 });
    }

    // "Makaleden Kaldır" Aksiyonu (is_active = false, denetim izi korunur)
    if (action === 'detach') {
      const { data: detached, error } = await supabase
        .from('article_media')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ media: detached, message: 'Görsel makaleden kaldırıldı (Denetim izi korundu).' });
    }

    if (updates.rights_status === 'unknown') {
      return NextResponse.json({ error: 'Telif/kullanım hakkı "unknown" (bilinmiyor) yapılamaz.' }, { status: 400 });
    }

    const { data: updatedMedia, error } = await supabase
      .from('article_media')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ media: updatedMedia, message: 'Görsel bilgileri güncellendi.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Güncelleme başarısız.' }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/content/media?id=<MEDIA_ID>
 * Kalıcı Sil (Yalnız admin/founder yetkisiyle, storage ve DB temizliği yapılır).
 */
export async function DELETE(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Görsel id gereklidir.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('article_media')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Görsel veritabanından kalıcı olarak silindi.' });
}
