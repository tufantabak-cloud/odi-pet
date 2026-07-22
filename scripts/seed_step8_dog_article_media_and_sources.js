require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedStep8DogData() {
  console.log('=== Step 8: Seeding Sources & References for Dog Article ===');

  const { data: dogArt } = await supabase
    .from('articles')
    .select('id, title, references_list')
    .ilike('title', '%Köpeklerde Temel Sosyalleşme%')
    .single();

  if (!dogArt) {
    console.error('Dog article not found!');
    return;
  }

  // 1. Eklenen Kaynaklar (Web & Instagram)
  const sourcesPayload = [
    {
      article_id: dogArt.id,
      source_type: 'official',
      source_title: 'AKC Puppy Socialization Checklist and Guide',
      source_url: 'https://www.akc.org/dog-owners/puppy-socialization/',
      publisher: 'American Kennel Club',
      is_active: true
    },
    {
      article_id: dogArt.id,
      source_type: 'reputable_editorial',
      source_title: 'Puppy Socialization Reel Video Guide',
      source_url: 'https://www.instagram.com/p/C3x9189tXyZ/',
      publisher: 'Instagram @odipet_dogtrainers',
      is_active: true
    },
    {
      article_id: dogArt.id,
      source_type: 'scientific',
      source_title: 'Dahili İnceleme Notu (Yayında Gizli)',
      source_url: 'https://www.akc.org/internal-note',
      publisher: 'OdiPet Internal',
      is_active: false // Yayında Gizli (is_active = false)
    }
  ];

  for (const s of sourcesPayload) {
    const { data: inserted, error: sErr } = await supabase
      .from('article_sources')
      .insert([s])
      .select();

    if (sErr) console.error('Source Insert Error:', sErr.message);
    else console.log(`+ Added Source [${inserted[0]?.id}]: "${s.source_title}" (active: ${s.is_active})`);
  }

  // 2. Makalenin Görsel Kapak Adresini Güncelle
  await supabase
    .from('articles')
    .update({
      cover_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
      references_list: [
        'American Kennel Club — Erken Yaş Köpek Sosyalleşme Kontrol Listesi',
        'Instagram: @odipet_dogtrainers — Ses ve Zemin Duyarsızlaştırma Eğitimi',
        'PMID 23018794: Importance of puppy training for future behavior of the dog.',
        'PMID 30101101: Puppy parties and beyond: early age socialization practices.'
      ]
    })
    .eq('id', dogArt.id);

  console.log('\nStep 8 Dog Article Media & Managed Sources Seeding Complete!');
}

seedStep8DogData().catch(console.error);
