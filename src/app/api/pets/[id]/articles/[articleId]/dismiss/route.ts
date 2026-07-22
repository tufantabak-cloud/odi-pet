import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pets/[id]/articles/[articleId]/dismiss
 * Kullanıcının "İlgilenmiyorum" tercihini kaydeder.
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

  // Pet Sahiplik Kontrolü
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
      return NextResponse.json({ error: 'Erişim yetkiniz yok.' }, { status: 403 });
    }
  }

  const { error } = await supabase.from('article_pet_states').upsert(
    {
      user_id: user.id,
      pet_id: petId,
      article_id: articleId,
      dismissed_at: new Date().toISOString()
    },
    { onConflict: 'user_id,pet_id,article_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
