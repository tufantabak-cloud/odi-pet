import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import { recommendContentForPet } from '@/lib/content/personalizedContentEngine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pets/[id]/content-recommendations
 * Aktif pete özel ve genel içerik önerilerini döndürür.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { id: petId } = await params;
  const supabase = await createServerSupabaseClient();

  // 1. Pet Var Olma ve Sahiplik Doğrulaması (Direct Owner veya Multi-Owner)
  const { data: pet, error: petErr } = await supabase
    .from('pets')
    .select('id, name, species, breed, birth_date, gender, is_neutered, owner_id')
    .eq('id', petId)
    .single();

  if (petErr || !pet) {
    return NextResponse.json({ error: 'Pet bulunamadı.' }, { status: 404 });
  }

  const isOwner = pet.owner_id === user.id;
  if (!isOwner) {
    const { data: coOwner } = await supabase
      .from('pet_owners')
      .select('id')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!coOwner) {
      return NextResponse.json({ error: 'Bu petin bilgilerine erişim yetkiniz yok.' }, { status: 403 });
    }
  }

  // 2. Yayınlanmış ve Güvenli Makaleleri Çek
  const { data: rawArticles, error: artErr } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('priority_order', { ascending: false });

  if (artErr) {
    return NextResponse.json({ error: artErr.message }, { status: 500 });
  }

  // Güvenlik süzgeci: Tıbbi içerik onaylanmamışsa normal kullanıcıya görünmesin
  const eligibleArticles = (rawArticles || []).filter((art) => {
    if (art.is_medical_content && art.vet_review_status !== 'approved') {
      return false;
    }
    return true;
  });

  // 3. Etkileşim ve Kaydetme Durumlarını Çek
  const { data: states } = await supabase
    .from('article_pet_states')
    .select('article_id, pet_id, dismissed_at, read_at, last_shown_at')
    .eq('user_id', user.id)
    .eq('pet_id', petId);

  const { data: saves } = await supabase
    .from('article_saves')
    .select('article_id')
    .eq('user_id', user.id);

  const savedArticleIds = (saves || []).map((s) => s.article_id);

  // 4. Eşleştirme Motorunu Çalıştır
  const currentMonth = new Date().getMonth() + 1;
  let currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'spring';
  if (currentMonth >= 3 && currentMonth <= 5) currentSeason = 'spring';
  else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = 'summer';
  else if (currentMonth >= 9 && currentMonth <= 11) currentSeason = 'autumn';
  else currentSeason = 'winter';

  const engineResult = recommendContentForPet(
    pet,
    eligibleArticles,
    states || [],
    { currentSeason }
  );

  // 5. Gösterilen Kartlar İçin last_shown_at Güncelle (Otoriter Sunucu Kaydı)
  const shownIds: string[] = [];
  if (engineResult.generalRecommendation) shownIds.push(engineResult.generalRecommendation.article.id);
  if (engineResult.personalizedRecommendation) shownIds.push(engineResult.personalizedRecommendation.article.id);

  if (shownIds.length > 0) {
    const nowIso = new Date().toISOString();
    for (const artId of shownIds) {
      await supabase.from('article_pet_states').upsert(
        {
          user_id: user.id,
          pet_id: petId,
          article_id: artId,
          last_shown_at: nowIso
        },
        { onConflict: 'user_id,pet_id,article_id' }
      );
    }
  }

  return NextResponse.json({
    generalRecommendation: engineResult.generalRecommendation,
    personalizedRecommendation: engineResult.personalizedRecommendation,
    savedArticleIds
  });
}
