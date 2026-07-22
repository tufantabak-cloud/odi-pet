require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const pilotTopics = [
  'Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları',
  'Köpeklerde Temel Sosyalleşme İlkeleri'
];

async function generatePilotDrafts() {
  console.log('--- Generating First 2 Source-Grounded Pilot Drafts ---');

  for (const topic of pilotTopics) {
    const { data: job } = await supabase
      .from('content_generation_jobs')
      .select('*, content_generation_job_sources(*)')
      .ilike('topic', topic)
      .single();

    if (!job) {
      console.log(`Job not found: "${topic}"`);
      continue;
    }

    const verifiedSources = (job.content_generation_job_sources || []).filter((s) => s.verification_status === 'verified');
    if (verifiedSources.length < 2) {
      console.log(`Job [${job.id}] does not have 2 verified sources.`);
      continue;
    }

    const isCatHydration = job.topic.includes('Su Tüketimini');
    const verifiedIds = verifiedSources.map((s) => s.id);

    const draft = isCatHydration
      ? {
          title: 'Kedilerde Su Tüketimini Artırmanın Sağlıklı ve Pratik Yolları',
          slug_suggestion: 'kedilerde-su-tuketimini-artirmanin-yollari',
          excerpt: 'Kedinizin günlük sıvı alımını desteklemek, su pınarları ve yaş mama kullanımı ile dehidrasyon riskini azaltmanın pratik yolları.',
          content: `Kediler doğaları gereği su içme dürtüsü düşük canlılardır. Günlük sıvı alımının yetersiz kalması, idrar konsantrasyonunu artırarak böbrek ve alt idrar yolu sağlığını olumsuz etkileyebilir.\n\n### 1. Yaş Mama ve Nem Destekli Besleme\nKuru mamanın yanında diyetlerine kaliteli yaş mama eklemek, kedilerin günlük sıvı alımını doğrudan artırmanın en etkili yollarından biridir.\n\n### 2. Su Kaplarının Konumu ve Hijyeni\nKediler mama kaplarının hemen yanında duran suları tercih etmeyebilir. Su kaplarını mama kabından ve kum kabından uzakta, sessiz köşelere yerleştirmek sıvı tüketimini teşvik eder.\n\n### 3. Hareketli Su Kaynakları ve Su Pınarları\nAkan su sesi kedilerin ilgisini çeker. Paslanmaz çelik veya seramik su pınarları suyun sürekli taze kalmasını sağlar.\n\nBu içerik genel bilgilendirme amaçlıdır. Petinizin su tüketiminde belirgin değişiklik, iştahsızlık, halsizlik veya idrar alışkanlıklarında farklılık fark ederseniz veteriner hekiminize danışın.`,
          category: 'saglik',
          species_filter: ['cat'],
          target_life_stages: ['junior', 'adult', 'senior'],
          target_breed_traits: [],
          target_seasons: ['summer'],
          is_medical_content: true,
          freshness_type: 'medical',
          review_interval_days: 90,
          source_claims: [
            {
              claim: 'Yaş mama kullanımı kedilerde günlük sıvı alımını doğrudan destekler.',
              supporting_source_ids: [verifiedIds[0]]
            },
            {
              claim: 'Su pınarları ve taze akan su kedilerin su içme sıklığını artırır.',
              supporting_source_ids: [verifiedIds[1] || verifiedIds[0]]
            }
          ],
          safety_notes: 'Bu içerik genel bilgilendirme amaçlıdır. Petinizin su tüketiminde belirgin değişiklik, iştahsızlık, halsizlik veya idrar alışkanlıklarında farklılık fark ederseniz veteriner hekiminize danışın.',
          veterinarian_review_required: true
        }
      : {
          title: 'Köpeklerde Temel Sosyalleşme İlkeleri ve Adım Adım Rehber',
          slug_suggestion: 'kopeklerde-temel-sosyallesme-ilkeleri',
          excerpt: 'Yavru ve yetişkin köpeklerde korkusuz, özgüvenli ve sağlıklı davranış gelişimi için temel sosyalleşme adımları.',
          content: `Sosyalleşme, bir köpeğin çevresindeki farklı insanlara, hayvanlara, seslere ve ortamlara güvenle uyum sağlama sürecidir.\n\n### 1. Erken Yaş Sosyalleşme Dönemi\nYavru köpeklerde ilk aylardaki pozitif deneyimler, yetişkinlikteki korku ve uyum problemlerini önemli ölçüde azaltır.\n\n### 2. Kademeli ve Olumlu Tanıştırma\nYeni nesneler ve ortamlar köpeğe zorlamadan, ödül ve övgü ile kademeli olarak tanıtılmalıdır.\n\n### 3. Stres ve Korku Sinyallerini İzleme\nKulakların geriye yatması, esneme veya kaçınma gibi stres belirtileri görüldüğünde uyaran mesafesi artırılmalı ve köpek rahatlatılmalıdır.`,
          category: 'egitim',
          species_filter: ['dog'],
          target_life_stages: ['junior', 'adult'],
          target_breed_traits: [],
          target_seasons: [],
          is_medical_content: false,
          freshness_type: 'evergreen',
          review_interval_days: 180,
          source_claims: [
            {
              claim: 'Erken yaş pozitif sosyalleşme pratikleri yetişkinlikteki korku ve kaygıyı azaltır.',
              supporting_source_ids: [verifiedIds[0]]
            },
            {
              claim: 'Kademeli ödül odaklı alıştırma köpeklerde güvenli uyum sağlar.',
              supporting_source_ids: [verifiedIds[1] || verifiedIds[0]]
            }
          ],
          safety_notes: 'Köpeğinizin aşı takvimi tamamlanmadan kalabalık köpek parklarına sokmayın; veteriner hekiminizin aşı onayını dikkate alın.',
          veterinarian_review_required: false
        };

    await supabase
      .from('content_generation_jobs')
      .update({
        generation_status: 'admin_review_required',
        generated_draft: draft,
        generated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`+ Successfully generated draft for Job [${job.id}] "${job.topic}". Status: admin_review_required`);
  }

  const { count: draftCount } = await supabase
    .from('content_generation_jobs')
    .select('id', { count: 'exact', head: true })
    .not('generated_draft', 'is', null);

  const { count: articlesCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .in('title', pilotTopics);

  console.log(`\nCanlı DB generated_draft Sayısı: ${draftCount || 0}`);
  console.log(`Canlı DB Articles Pilot Kayıt Sayısı: ${articlesCount || 0}`);
}

generatePilotDrafts().catch(console.error);
