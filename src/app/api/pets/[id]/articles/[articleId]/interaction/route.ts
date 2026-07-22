import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pets/[id]/articles/[articleId]/interaction
 * Pet/Makale etkileşim durumlarını (shown | viewed) açık ve idipotent olarak kaydeder.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; articleId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { id: petId, articleId } = await params;
  const supabase = await createServerSupabaseClient();

  // 1. Pet Sahipliği Kontrolü (Direct Owner veya Multi-Owner)
  const { data: pet } = await supabase
    .from('pets')
    .select('id, owner_id')
    .eq('id', petId)
    .single();

  if (!pet) {
    return NextResponse.json({ error: 'Pet bulunamadı.' }, { status: 404 });
  }

  if (pet.owner_id !== user.id) {
    const { data: coOwner } = await supabase
      .from('pet_owners')
      .select('id')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!coOwner) {
      return NextResponse.json({ error: 'Bu pet için etkileşim kaydetme yetkiniz yok.' }, { status: 403 });
    }
  }

  try {
    const body = await req.json();
    const action = body.action; // 'shown' | 'viewed'

    if (action !== 'shown' && action !== 'viewed') {
      return NextResponse.json({ error: 'Geçersiz action türü.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const updateData: Record<string, any> = {
      user_id: user.id,
      pet_id: petId,
      article_id: articleId
    };

    if (action === 'shown') {
      updateData.last_shown_at = nowIso;
    } else if (action === 'viewed') {
      updateData.last_viewed_at = nowIso;
    }

    // Otoriter Upsert (İstemciden gönderilen user_id göz ardı edilir)
    const { error: upsertErr } = await supabase
      .from('article_pet_states')
      .upsert(updateData, { onConflict: 'user_id,pet_id,article_id' });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, action });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Geçersiz istek.' }, { status: 400 });
  }
}
