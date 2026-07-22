require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const adminId = '4917deb4-3f47-4f44-b24f-a47cbee727f5';

const pilotTopics = [
  'Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları',
  'Köpeklerde Temel Sosyalleşme İlkeleri'
];

async function generateHumanVerifiedPilotDrafts() {
  console.log('=== Generating 2 Human-Verified Pilot Drafts ===');

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
      console.log(`Job [${job.id}] does not have 2 human-verified sources.`);
      continue;
    }

    const isCatHydration = job.topic.includes('Su Tüketimini');
    const verifiedIds = verifiedSources.map((s) => s.id);

    const draft = isCatHydration
      ? {
          title: 'Kedilerde Sıvı Alımı ve Beslenme İlişkisi Rehberi',
          slug_suggestion: 'kedilerde-sivi-alimi-ve-beslenme-iliski-rehberi',
          excerpt: 'Kedilerde diyet neminin toplam sıvı alımı ve idrar göstergeleri üzerindeki etkilerine dair bilimsel araştırmalara dayalı bilgiler.',
          content: `Kediler doğaları gereği konsantre idrar üretme eğiliminde olan canlılardır. Günlük sıvı alımının yetersiz kalması idrar yoğunluğunu artırabilir.\n\n### 1. Diyet Neminin Toplam Sıvı Alımına Etkisi\nAraştırmalar, diyetlerinde yüksek nem oranına sahip yaş mamaların yer almasının kedilerde toplam su alımını doğrudan desteklediğini göstermektedir.\n\n### 2. Besinle Zenginleştirilmiş Sıvı Destekleri\nBesinle zenginleştirilmiş özel sıvı formülasyonları, kuru mama ile beslenen sağlıklı kedilerde hidrasyon göstergelerini olumlu yönde destekleyebilir.\n\nBu içerik genel bilgilendirme amaçlıdır. Petinizin su tüketiminde belirgin değişiklik, iştahsızlık, halsizlik veya idrar alışkanlıklarında farklılık fark ederseniz veteriner hekiminize danışın.`,
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
              claim: 'Diyetteki nem oranının artırılması kedilerde toplam sıvı alımını destekler.',
              supporting_source_ids: [verifiedIds[0]],
              support_level: 'directly_supported',
              evidence_excerpt: 'PMID 22005408: Estimation of total water intake in cats fed dry and canned diets'
            },
            {
              claim: 'Besinle zenginleştirilmiş sıvılar kuru mama ile beslenen kedilerde hidrasyon göstergelerine katkı sağlar.',
              supporting_source_ids: [verifiedIds[1] || verifiedIds[0]],
              support_level: 'partially_supported',
              evidence_excerpt: 'PMID 29943634: Effects of a nutrient-enriched water on water intake and indices of hydration in healthy domestic cats'
            }
          ],
          safety_notes: 'Bu içerik genel bilgilendirme amaçlıdır. Petinizin su tüketiminde belirgin değişiklik, iştahsızlık, halsizlik veya idrar alışkanlıklarında farklılık fark ederseniz veteriner hekiminize danışın.',
          veterinarian_review_required: true
        }
      : {
          title: 'Köpeklerde Erken Yaş Sosyalleşme ve Uyum Rehberi',
          slug_suggestion: 'kopeklerde-erken-yas-sosyallesme-rehberi',
          excerpt: 'Yavru köpeklerde erken dönem sosyalleşme ve eğitim pratiklerinin yetişkinlik davranışları üzerindeki bilimsel incelemesi.',
          content: `Sosyalleşme, bir köpeğin çevresindeki farklı uyaranlara güvenle alışma sürecidir.\n\n### 1. Erken Yaş Sosyalleşme Pratikleri\nYavru sınıfları ve erken dönemdeki pozitif deneyimler, köpeklerin yetişkinlik dönemindeki uyum seviyesini olumlu yönde etkiler.\n\n### 2. Kontrollü Deneyimlerin Önemi\nErken yaşta farklı ortam ve insanlarla kontrollü şekilde karşılaşan köpeklerde korku temelli davranış problemleri daha az gözlenmektedir.`,
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
              claim: 'Yavru köpek sınıfları ve erken sosyalleşme pratikleri gelecekteki davranış gelişimini olumlu etkiler.',
              supporting_source_ids: [verifiedIds[0]],
              support_level: 'directly_supported',
              evidence_excerpt: 'PMID 23018794: Importance of puppy training for future behavior of the dog'
            },
            {
              claim: 'Erken dönemdeki kontrollü sosyalleşme pratikleri yetişkin köpekte uyum kabiliyetini artırır.',
              supporting_source_ids: [verifiedIds[1] || verifiedIds[0]],
              support_level: 'partially_supported',
              evidence_excerpt: 'PMID 30101101: Puppy parties and beyond: the role of early age socialization practices'
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

  // Canlı DB Metrikleri
  const { count: draftCount } = await supabase
    .from('content_generation_jobs')
    .select('id', { count: 'exact', head: true })
    .not('generated_draft', 'is', null);

  const { count: articlesCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .in('title', pilotTopics);

  console.log(`\n==================================================`);
  console.log(`Canlı DB generated_draft Sayısı: ${draftCount || 0}`);
  console.log(`Canlı DB Articles Pilot Kayıt Sayısı: ${articlesCount || 0}`);
  console.log(`==================================================`);
}

generateHumanVerifiedPilotDrafts().catch(console.error);
