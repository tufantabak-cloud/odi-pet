import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

const VALID_SOURCE_TYPES = [
  'pubmed',
  'scientific_article',
  'official_guideline',
  'web_page',
  'instagram_post',
  'instagram_profile',
  'manual_reference',
  'official',
  'veterinary_guideline',
  'scientific',
  'manufacturer',
  'reputable_editorial'
];

/**
 * GET /api/admin/content/sources?article_id=<ARTICLE_ID>
 * Makale kaynaklarını listeler.
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
  const { data: sources, error } = await supabase
    .from('article_sources')
    .select('*')
    .eq('article_id', articleId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sources: sources || [] });
}

/**
 * POST /api/admin/content/sources
 * Manuel web veya Instagram kaynağı ekler.
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
      source_type,
      source_name,
      source_title,
      source_url,
      publisher,
      instagram_username,
      short_description,
      display_in_article = true,
      show_source_name = true,
      show_source_link = true,
      sort_order = 0
    } = body;

    if (!article_id || !source_title) {
      return NextResponse.json({ error: 'article_id ve source_title zorunludur.' }, { status: 400 });
    }

    if (source_type && !VALID_SOURCE_TYPES.includes(source_type)) {
      return NextResponse.json({ error: `Geçersiz kaynak türü: ${source_type}` }, { status: 400 });
    }

    // URL Güvenlik ve Domain Doğrulaması (10. ve 4. Maddeler)
    if (source_url) {
      try {
        const parsedUrl = new URL(source_url);
        if (parsedUrl.protocol !== 'https:') {
          return NextResponse.json({ error: 'Yalnız HTTPS kaynak adresleri kabul edilir.' }, { status: 400 });
        }

        const hostname = parsedUrl.hostname.toLowerCase();
        // Disallowed internal / local IPs
        if (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '::1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.')
        ) {
          return NextResponse.json({ error: 'Dahili ağ veya localhost adresleri kaynak kabul edilemez.' }, { status: 400 });
        }

        // Instagram Domain Kısıtı (4. Madde)
        if (['instagram_post', 'instagram_profile'].includes(source_type)) {
          if (hostname !== 'instagram.com' && hostname !== 'www.instagram.com') {
            return NextResponse.json({ error: 'Instagram kaynakları yalnız instagram.com domain adreslerinden eklenebilir.' }, { status: 400 });
          }
        }
      } catch {
        return NextResponse.json({ error: 'Geçersiz kaynak URL formatı.' }, { status: 400 });
      }
    }

    const payload = {
      article_id,
      source_type: source_type || 'web_page',
      source_name: source_name || publisher || 'Web Kaynağı',
      source_title,
      source_url,
      publisher: publisher || source_name || 'Bilinmiyor',
      instagram_username: instagram_username || null,
      short_description: short_description || null,
      display_in_article: Boolean(display_in_article),
      show_source_name: Boolean(show_source_name),
      show_source_link: Boolean(show_source_link),
      sort_order: Number(sort_order) || 0,
      verification_status: 'proposed', // Otomatik verified YAPMA!
      verified_by: null,
      verified_at: null,
      created_by: actor.id
    };

    const { data: newSource, error } = await supabase
      .from('article_sources')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ source: newSource, message: 'Kaynak başarıyla eklendi.' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Geçersiz istek.' }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/content/sources
 * Kaynağı günceller (sıralama, görünürlük, başlık vb.).
 */
export async function PATCH(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Kaynak id gereklidir.' }, { status: 400 });
    }

    // Instagram domain denetimi if source_url updated
    if (updates.source_url && updates.source_type && ['instagram_post', 'instagram_profile'].includes(updates.source_type)) {
      try {
        const hostname = new URL(updates.source_url).hostname.toLowerCase();
        if (hostname !== 'instagram.com' && hostname !== 'www.instagram.com') {
          return NextResponse.json({ error: 'Instagram kaynakları yalnız instagram.com domain adreslerinden eklenebilir.' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Geçersiz Instagram URL.' }, { status: 400 });
      }
    }

    const { data: updatedSource, error } = await supabase
      .from('article_sources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ source: updatedSource, message: 'Kaynak güncellendi.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Güncelleme başarısız.' }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/content/sources?id=<SOURCE_ID>
 * Kaynağı makaleden kaldırır.
 */
export async function DELETE(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Kaynak id gereklidir.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('article_sources')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Kaynak makaleden kaldırıldı.' });
}
