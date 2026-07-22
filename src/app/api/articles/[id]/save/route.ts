import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

/**
 * POST / DELETE /api/articles/[id]/save
 * Makaleyi açık ve idempotent (tekrarlanabilir) olarak kaydeder veya kaydı kaldırır.
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

  let action = 'save'; // Varsayılan POST eylemi 'save'dir
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === 'unsave') action = 'unsave';
  } catch {
    // Body yoksa 'save'
  }

  if (action === 'save') {
    // Idempotent Save: Zaten kaydedildiyse hata vermeden { saved: true } döner
    const { data: existing } = await supabase
      .from('article_saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_id', articleId)
      .maybeSingle();

    if (!existing) {
      await supabase.from('article_saves').insert({
        user_id: user.id,
        article_id: articleId
      });
    }

    return NextResponse.json({ saved: true });
  } else {
    // Idempotent Unsave: Zaten yoksa hata vermeden { saved: false } döner
    await supabase
      .from('article_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('article_id', articleId);

    return NextResponse.json({ saved: false });
  }
}

/**
 * DELETE /api/articles/[id]/save
 * Idempotent Kaydı Kaldırma (Unsave)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { id: articleId } = await params;
  const supabase = await createServerSupabaseClient();

  await supabase
    .from('article_saves')
    .delete()
    .eq('user_id', user.id)
    .eq('article_id', articleId);

  return NextResponse.json({ saved: false });
}
