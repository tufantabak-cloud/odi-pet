require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyDogArticlePublishedStatus() {
  console.log('=== Checking Post-Publish Status for Dog Socialization & Cat Hydration Articles ===');

  // 1. Köpek Makalesini Publish Et (is_published = true)
  const { data: dogArt, error: dogErr } = await supabase
    .from('articles')
    .update({ is_published: true })
    .eq('title', 'Köpeklerde Temel Sosyalleşme İlkeleri')
    .select('*')
    .single();

  if (dogErr || !dogArt) {
    console.error('Error fetching/updating Dog Socialization article:', dogErr?.message);
  } else {
    console.log(`\n1. Köpek Makalesi ("${dogArt.title}"):`);
    console.log(`   - Article ID: ${dogArt.id}`);
    console.log(`   - Slug: ${dogArt.slug}`);
    console.log(`   - is_published: ${dogArt.is_published}`);
    console.log(`   - vet_review_status: ${dogArt.vet_review_status}`);
    console.log(`   - species_filter: ${JSON.stringify(dogArt.species_filter)}`);
    console.log(`   - references_list (${dogArt.references_list?.length || 0} adet kanıt özeti):`);
    (dogArt.references_list || []).forEach((ref, i) => console.log(`     [${i + 1}] ${ref}`));
  }

  // 2. Kedi Makalesinin Durumunu Doğrula (is_published = false)
  const { data: catArt, error: catErr } = await supabase
    .from('articles')
    .select('*')
    .eq('title', 'Kedilerde Sıvı Alımı ve Beslenme İlişkisi')
    .single();

  if (catErr || !catArt) {
    console.error('Error fetching Cat Hydration article:', catErr?.message);
  } else {
    console.log(`\n2. Kedi Makalesi ("${catArt.title}"):`);
    console.log(`   - Article ID: ${catArt.id}`);
    console.log(`   - is_published: ${catArt.is_published} (Must be false)`);
    console.log(`   - vet_review_status: ${catArt.vet_review_status} (Must be pending)`);
    console.log(`   - species_filter: ${JSON.stringify(catArt.species_filter)}`);
  }

  // 3. /owner/learn İzolasyon ve Tür Filtreleme Denetimi
  const { data: publicArticles } = await supabase
    .from('articles')
    .select('id, title, species_filter')
    .eq('is_published', true);

  console.log(`\n3. /owner/learn Genel Kullanıcıya Açık Makaleler (is_published = true):`);
  (publicArticles || []).forEach((a) => console.log(`   - [${a.id}] "${a.title}" (Species: ${JSON.stringify(a.species_filter)})`));

  const isCatIncludedInPublic = (publicArticles || []).some((a) => a.title.includes('Kedilerde Sıvı Alımı'));
  const isDogIncludedInPublic = (publicArticles || []).some((a) => a.title.includes('Köpeklerde Temel Sosyalleşme'));

  console.log(`\n   - Kedi Makalesi Kütüphanede Görünüyor mu? ${isCatIncludedInPublic ? 'EVET (HATA!)' : 'HAYIR (İZOLE & GİZLİ ✔)'}`);
  console.log(`   - Köpek Makalesi Kütüphanede Görünüyor mu? ${isDogIncludedInPublic ? 'EVET (YAYINDA ✔)' : 'HAYIR'}`);

  // 4. Kedi Aktif Petinde Köpek Makalesinin Görünmeme Filtresi
  const dogArticleSpecies = dogArt?.species_filter || [];
  const matchesCat = dogArticleSpecies.includes('cat');
  console.log(`   - Köpek Makalesi Kedi Aktif Petinde Görünür mü? ${matchesCat ? 'EVET (HATA!)' : 'HAYIR (Yalnızca Köpek Hedefli ✔)'}`);
}

verifyDogArticlePublishedStatus().catch(console.error);
