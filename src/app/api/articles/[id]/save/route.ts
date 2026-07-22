import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

/**
 * POST /api/articles/[id]/save
 * Makaleyi kaydeder veya kaydı kaldırır (Toggle).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { id: articleId } = await params;
  const supabase = await createServerSupabaseClient();

  // Mevcut kaydı kontrol et
  const { data: existing } = await supabase
    .from('article_saves')
    .select('id')
    .eq('user_id', user.id)
    .eq('article_id', articleId)
    .maybeSingle();

  if (existing) {
    // Kaydı kaldır
    const { error: delErr } = await supabase
      .from('article_saves')
      .delete()
      .eq('id', existing.id);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });
    return NextResponse.json({ saved: false });
  } else {
    // Kaydet
    const { error: insErr } = await supabase
      .from('article_saves')
      .insert({
        user_id: user.id,
        article_id: articleId
      });

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
    return NextResponse.json({ saved: true });
  }
}
