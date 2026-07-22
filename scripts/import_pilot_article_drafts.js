require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Test kaydını temizle
async function cleanupTestArticle() {
  await supabase.from('articles').delete().eq('slug', 'test-article-slug');
}

const pilotDraftsData = [
  {
    topic: 'Kedilerde Su Tüketimini Artırmanın Sağlıklı Yolları',
    title: 'Kedilerde Sıvı Alımı ve Beslenme İlişkisi',
    slug: 'kedilerde-sivi-alimi-ve-beslenme-iliskisi',
    content: `Kediler doğaları gereği konsantre idrar üretme eğiliminde olan canlılardır. Günlük sıvı alımının yetersiz kalması idrar yoğunluğunu artırabilir.\n\n### 1. Diyet Neminin Toplam Sıvı Alımına Etkisi\nAraştırılan koşullarda, daha yüksek nem içeren diyetlerin toplam sıvı alımını artırdığı ve daha seyreltik idrar göstergeleriyle ilişkili olduğu gözlenmiştir.\n\n### 2. Besinle Zenginleştirilmiş Sıvı Destekleri\nBir çalışmada, kuru mamayla beslenen sağlıklı kedilerde besinle zenginleştirilmiş özel bir su formülasyonunun sıvı tüketimi ve bazı hidrasyon göstergeleri üzerindeki etkileri incelenmiş ve olumlu yönelimler kaydedilmiştir.\n\nBu içerik genel bilgilendirme amaçlıdır. Petinizin su tüketiminde belirgin değişiklik, iştahsızlık, halsizlik veya idrar alışkanlıklarında farklılık fark ederseniz veteriner hekiminize danışın.`,
    category: 'saglik',
    species_filter: ['cat'],
    is_medical_content: true,
    freshness_type: 'medical',
    review_interval_days: 180,
    vet_review_status: 'pending',
    is_published: false,
    source_claims: [
      {
        claim: 'Daha yüksek nem içeren diyetler toplam sıvı alımını artırmış ve seyreltik idrar göstergeleriyle ilişkili bulunmuştur.',
        supporting_source_ids: ['https://pubmed.ncbi.nlm.nih.gov/22005408/'],
        support_level: 'directly_supported',
        evidence_summary: 'Kanıt özeti: Kedilerde kuru ve yaş mama diyetlerinin toplam su alımı ve idrar osmolalitesi üzerindeki etkilerini inceleyen klinik araştırma (PMID 22005408).'
      },
      {
        claim: 'Kuru mamayla beslenen sağlıklı kedilerde besinle zenginleştirilmiş özel bir su formülasyonunun hidrasyon göstergelerine katkısı incelenmiştir.',
        supporting_source_ids: ['https://pubmed.ncbi.nlm.nih.gov/29943634/'],
        support_level: 'partially_supported',
        evidence_summary: 'Kanıt özeti: Besinle zenginleştirilmiş suyun kuru mama yiyen kedilerdeki hidrasyon parametrelerine etkisini değerlendiren çalışma (PMID 29943634).'
      }
    ]
  },
  {
    topic: 'Köpeklerde Temel Sosyalleşme İlkeleri',
    title: 'Köpeklerde Temel Sosyalleşme İlkeleri',
    slug: 'kopeklerde-temel-sosyallesme-ilkeleri',
    content: `Sosyalleşme, bir köpeğin çevresindeki farklı uyaranlara güvenle alışma sürecidir.\n\n### 1. Erken Yaş Sosyalleşme Pratikleri\nYavru sınıfları ve erken dönemdeki pozitif deneyimler, köpeklerin yetişkinlik dönemindeki uyum seviyesi ve sonraki davranışlarıyla ilişkili bulunmuştur.\n\n### 2. Kontrollü Deneyimlerin Önemi\nErken yaşta farklı ortam ve insanlarla kontrollü şekilde karşılaşan köpeklerde daha az korku ve davranış problemi bildirilmesiyle ilişkilendirilmiştir.\n\nYavru köpeğinizi yeni hayvanlar ve ortamlarla tanıştırırken sağlık ve aşı durumuna uygun hareket etmek için veteriner hekiminizin önerisini alın. Belirgin korku, saldırganlık veya yoğun stres durumunda veteriner hekimden ya da yetkin bir davranış uzmanından destek alın.`,
    category: 'egitim',
    species_filter: ['dog'],
    is_medical_content: false,
    freshness_type: 'evergreen',
    review_interval_days: 365,
    vet_review_status: 'not_required',
    is_published: false,
    source_claims: [
      {
        claim: 'Yavru köpek eğitim sınıfları yetişkinlikte olumlu davranış gelişimiyle ilişkili bulunmuştur.',
        supporting_source_ids: ['https://pubmed.ncbi.nlm.nih.gov/23018794/'],
        support_level: 'directly_supported',
        evidence_summary: 'Kanıt özeti: Yavru köpek eğitiminin köpeğin gelecekteki davranışı üzerindeki etkisini inceleyen saha araştırması (PMID 23018794).'
      },
      {
        claim: 'Erken yaştaki sosyalleşme pratikleri yetişkin köpekte daha az korku bildirimiyle ilişkilendirilmiştir.',
        supporting_source_ids: ['https://pubmed.ncbi.nlm.nih.gov/30101101/'],
        support_level: 'partially_supported',
        evidence_summary: 'Kanıt özeti: Erken sosyalleşme partileri ve uygulamalarının yetişkin köpek davranışıyla ilişkisini değerlendiren çalışma (PMID 30101101).'
      }
    ]
  }
];

async function importPilotArticleDrafts() {
  await cleanupTestArticle();
  console.log('=== Importing 2 Reviewed Article Drafts into Articles Table (Idempotent) ===');

  const importedResults = [];

  for (const draftInfo of pilotDraftsData) {
    // 1. İlgili İş Kaydını Çek
    const { data: job } = await supabase
      .from('content_generation_jobs')
      .select('*')
      .ilike('topic', draftInfo.topic)
      .single();

    if (!job) {
      console.log(`Job not found for topic: "${draftInfo.topic}"`);
      continue;
    }

    // 2. Articles Tablosunda Var mı Kontrol Et (Idempotent)
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id')
      .eq('title', draftInfo.title)
      .maybeSingle();

    let articleId = '';

    const articlePayload = {
      title: draftInfo.title,
      slug: draftInfo.slug,
      content: draftInfo.content,
      category: draftInfo.category,
      species_filter: draftInfo.species_filter,
      is_medical_content: draftInfo.is_medical_content,
      freshness_type: draftInfo.freshness_type,
      review_interval_days: draftInfo.review_interval_days,
      vet_review_status: draftInfo.vet_review_status,
      is_published: false, // KESİNLİKLE TASLAK (PUBLISHED DEĞİL!)
      references_list: draftInfo.source_claims.map((sc) => sc.evidence_summary),
      latest_change_summary: 'P1 ADIM 7F — Otoriter pilot taslak admin onay kuyruğuna aktarıldı.'
    };

    if (existingArticle) {
      articleId = existingArticle.id;
      await supabase
        .from('articles')
        .update(articlePayload)
        .eq('id', articleId);
      console.log(`+ Updated existing article: [${articleId}] "${draftInfo.title}"`);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('articles')
        .insert(articlePayload)
        .select('id')
        .single();

      if (insErr || !inserted) {
        console.error(`Error inserting article "${draftInfo.title}":`, insErr?.message);
        continue;
      }
      articleId = inserted.id;
      console.log(`+ Inserted new article: [${articleId}] "${draftInfo.title}"`);
    }

    // 3. Job kaydına article_id bağla ve generation_status = 'imported' yap
    await supabase
      .from('content_generation_jobs')
      .update({
        article_id: articleId,
        generation_status: 'imported',
        generated_draft: draftInfo
      })
      .eq('id', job.id);

    importedResults.push({
      title: draftInfo.title,
      articleId,
      is_published: false,
      vet_review_status: draftInfo.vet_review_status,
      pmids: draftInfo.source_claims.map((sc) => sc.supporting_source_ids[0])
    });
  }

  // 4. Canlı DB Metrik Kontrolü
  const { count: articlesCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .in('title', pilotDraftsData.map((d) => d.title));

  const { count: publishedCount } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .in('title', pilotDraftsData.map((d) => d.title))
    .eq('is_published', true);

  console.log(`\n==================================================`);
  console.log(`Import Summary: Created Articles: ${articlesCount || 0}, Published (Must be 0): ${publishedCount || 0}`);
  console.log(`==================================================`);

  console.log('\nImported Results Details:', JSON.stringify(importedResults, null, 2));
}

importPilotArticleDrafts().catch(console.error);
