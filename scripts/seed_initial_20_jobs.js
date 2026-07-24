require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

// ── P0 GÜVENLİK BARİYERİ ──
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || process.env.CI === 'true';
const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');

if (!isLocal) {
  if (isTestEnv) {
    throw new Error('REFUSING_REMOTE_DATABASE_SEED: Test veya CI ortamında uzak hedefe bağlantı kesinlikle yasaktır.');
  }
  if (process.env.ALLOW_REMOTE_SEED !== 'true') {
    throw new Error('REFUSING_REMOTE_DATABASE_SEED: Uzak üretim veritabanına seed çalıştırmak için ALLOW_REMOTE_SEED=true ortam değişkeni gereklidir.');
  }
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const initial20Topics = [
  { topic: 'Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları', is_medical: true, species: ['cat'] },
  { topic: 'Kedilerde Tırmalama İhtiyacı ve Doğru Tırmalama Tahtası Seçimi', is_medical: false, species: ['cat'] },
  { topic: 'Kedi Kum Kabı Hijyeni ve Konumlandırma Rehberi', is_medical: false, species: ['cat'] },
  { topic: 'Kedilerde Ev İçi Zihinsel Uyarım ve Oyun Rutinleri', is_medical: false, species: ['cat'] },
  { topic: 'Sıcak Havalarda Köpek Gezdirme ve Pati Sağlığı Rehberi', is_medical: true, species: ['dog'] },
  { topic: 'Köpeklerde Ağız ve Diş Bakımı İpuçları', is_medical: true, species: ['dog'] },
  { topic: 'Köpek Gezdirirken Kayış ve Göğüs Tasması Seçimi', is_medical: false, species: ['dog'] },
  { topic: 'Köpeklerde Temel Sosyalleşme İlkeleri', is_medical: false, species: ['dog'] },
  { topic: 'Yavru Kedilerde İlk 6 Ay Besleme ve Gelişim Takibi', is_medical: true, species: ['cat'] },
  { topic: 'Yavru Köpeklerde Tuvalet Eğitimi ve Rutin Oluşturma', is_medical: false, species: ['dog'] },
  { topic: 'Yaşlı Kedilerde Eklem ve Hareket Kolaylaştırma İpuçları', is_medical: true, species: ['cat'] },
  { topic: 'Yaşlı Köpeklerde Kilo Yönetimi ve Kolay Egzersizler', is_medical: true, species: ['dog'] },
  { topic: 'Yaz Aylarında Kedilerde Dehidrasyon Belirtileri ve Önlemler', is_medical: true, species: ['cat'] },
  { topic: 'Kış Soğuklarında Dışarı Çıkan Köpeklerin Korunması', is_medical: false, species: ['dog'] },
  { topic: 'Evcil Hayvan Dostu Bitkiler ve Ev İçi Güvenlik Önlemleri', is_medical: true, species: ['cat', 'dog'] },
  { topic: 'Seyahat Esnasında Evcil Hayvan Taşıma ve Güvenlik Kuralları', is_medical: false, species: ['cat', 'dog'] },
  { topic: 'Kıvırcık Tüylü Köpeklerde Kıtık Önleme ve Tarak Seçimi', is_medical: false, species: ['dog'] },
  { topic: 'Basık Burunlu (Brachycephalic) Kedilerde Solunum ve Yüz Bakımı', is_medical: true, species: ['cat'] },
  { topic: 'Uzun Tüylü Kedilerde Tüy Yumağı ve Günlük Tarama Rutini', is_medical: false, species: ['cat'] },
  { topic: 'Küçük Irk Köpeklerde Porsiyon Düzeni ve Koruyucu Beslenme', is_medical: true, species: ['dog'] }
];

async function seedInitialJobs() {
  console.log('--- Seeding Initial 20 Content Generation Jobs (Queued / Research Required) ---');
  let addedCount = 0;
  let skippedCount = 0;

  for (const item of initial20Topics) {
    // Idempotent Kontrolü
    const { data: existing } = await supabase
      .from('content_generation_jobs')
      .select('id')
      .ilike('topic', item.topic)
      .maybeSingle();

    if (existing) {
      skippedCount++;
      continue;
    }

    const { error } = await supabase
      .from('content_generation_jobs')
      .insert({
        job_type: 'new_content',
        article_id: null,
        topic: item.topic,
        generation_status: 'research_required', // ASLA DRAFT_READY veya IMPORTED DEĞİL
        proposed_targeting: {
          species_filter: item.species,
          is_medical_content: item.is_medical
        },
        generated_by: 'seed_script'
      });

    if (error) {
      console.error(`Error inserting job "${item.topic}":`, error.message);
    } else {
      addedCount++;
    }
  }

  console.log(`Initial 20 Jobs Seeding Completed! Added: ${addedCount}, Skipped (Already Exists): ${skippedCount}`);
}

seedInitialJobs().catch(console.error);
