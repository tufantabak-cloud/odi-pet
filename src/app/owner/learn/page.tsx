import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import { isArticleEligibleForUser } from '@/lib/content/contentHelpers';
import LearnClient from './LearnClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bilgi ve Rehber | Odi',
  description: 'Petinizin sağlığı, bakımı ve mutlu yaşamı için güvenilir bilgiler.'
};

export default async function LearnPage({
  searchParams
}: {
  searchParams: Promise<{ petId?: string }>;
}) {
  const { petId } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const user = await getSessionUser();

  // 1. Yayınlanmış Tüm Makaleleri Çek
  const { data: rawArticles } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .is('archived_at', null)
    .order('priority_order', { ascending: false });

  // Merkezi Görünürlük & Güncellik Kuralı ile Süz
  const eligibleArticles = (rawArticles || []).filter((art) => {
    const hasSources = Boolean(art.references_list && art.references_list.length > 0);
    return isArticleEligibleForUser(art, hasSources);
  });

  // 2. Kullanıcının Petlerini Çek
  let userPets: any[] = [];
  let savedArticleIds: string[] = [];

  if (user) {
    // Sahiplik ve Ortak Sahiplik Petleri
    const { data: directPets } = await supabase
      .from('pets')
      .select('id, name, species, breed, birth_date, gender, is_neutered, weight_kg')
      .eq('owner_id', user.id);

    const { data: coOwnerRecords } = await supabase
      .from('pet_owners')
      .select('pet_id, pets(id, name, species, breed, birth_date, gender, is_neutered, weight_kg)')
      .eq('profile_id', user.id);

    const coPets = (coOwnerRecords || []).map((r: any) => r.pets).filter(Boolean);
    const petMap = new Map();
    [...(directPets || []), ...coPets].forEach((p) => petMap.set(p.id, p));
    userPets = Array.from(petMap.values());

    // Kaydedilen Makaleler
    const { data: saves } = await supabase
      .from('article_saves')
      .select('article_id')
      .eq('user_id', user.id);

    savedArticleIds = (saves || []).map((s) => s.article_id);
  }

  return (
    <LearnClient
      articles={eligibleArticles}
      userPets={userPets}
      initialSavedIds={savedArticleIds}
      initialPetId={petId}
    />
  );
}