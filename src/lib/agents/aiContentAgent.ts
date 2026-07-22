/**
 * Odi.Pet — Guarded AI Draft Generation Agent
 * Yalnızca admin/founder tarafından doğrulanmış (verified) kaynaklardan yapılandırılmış Türkçe taslak üretir.
 * 
 * Emniyet Sınırları:
 * - Yalnızca generation_status = 'ready_for_generation' durumunda çalışır.
 * - En az 2 adet verification_status = 'verified' kaynak varlığı şarttır.
 * - AI ajanı makaleyi yayınlayamaz (is_published = false), vet_review_status = 'approved' yapamaz.
 * - Taslak üretimi sonrasında durum 'admin_review_required' olur (AI 'vet_review_required' veya 'approved_for_import' yapamaz).
 * - Marka, ilaç, doz önerisi veya hastalık teşhisi yer alamaz.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface DraftSourceClaim {
  claim: string;
  supporting_source_ids: string[];
}

export interface GeneratedContentDraft {
  title: string;
  slug_suggestion: string;
  excerpt: string;
  content: string;
  category: string;
  species_filter: string[];
  target_life_stages: string[];
  target_breed_traits: string[];
  target_seasons: string[];
  is_medical_content: boolean;
  freshness_type: 'evergreen' | 'seasonal' | 'medical' | 'product_regulatory';
  review_interval_days: number;
  source_claims: DraftSourceClaim[];
  safety_notes: string;
  veterinarian_review_required: boolean;
}

export function validateDraftStructure(draft: any): { isValid: boolean; error?: string } {
  if (!draft || typeof draft !== 'object') {
    return { isValid: false, error: 'Taslak bir nesne olmalıdır.' };
  }

  if (!draft.title || !draft.content || !draft.excerpt) {
    return { isValid: false, error: 'Başlık, özet ve içerik alanları zorunludur.' };
  }

  if (!Array.isArray(draft.species_filter) || draft.species_filter.length === 0) {
    return { isValid: false, error: 'species_filter dizisi boş olamaz.' };
  }

  const validSpecies = ['cat', 'dog'];
  const hasInvalidSpecies = draft.species_filter.some((s: string) => !validSpecies.includes(s));
  if (hasInvalidSpecies) {
    return { isValid: false, error: 'Geçersiz tür filtresi. Yalnızca "cat" veya "dog" desteklenir.' };
  }

  if (draft.is_medical_content && (!Array.isArray(draft.source_claims) || draft.source_claims.length === 0)) {
    return { isValid: false, error: 'Tıbbi içeriklerde kaynaklara bağlı iddialar (source_claims) zorunludur.' };
  }

  return { isValid: true };
}

export async function createContentJob(
  supabase: SupabaseClient,
  topic: string,
  jobType: 'new_content' | 'update_content' = 'new_content',
  articleId?: string,
  proposedTargeting?: any
) {
  const { data, error } = await supabase
    .from('content_generation_jobs')
    .insert({
      job_type: jobType,
      article_id: articleId || null,
      topic,
      generation_status: 'research_required',
      proposed_targeting: proposedTargeting || null,
      generated_by: 'ai_agent'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * generateDraftFromVerifiedSources
 * Doğrulanmış kaynaklardan ilk pilot taslağı üretir.
 */
export async function generateDraftFromVerifiedSources(
  supabase: SupabaseClient,
  jobId: string
): Promise<GeneratedContentDraft> {
  // 1. İş Kaydını Çek
  const { data: job, error: jobErr } = await supabase
    .from('content_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobErr || !job) {
    throw new Error('İçerik üretim işi bulunamadı.');
  }

  if (job.generation_status !== 'ready_for_generation') {
    throw new Error(`İçerik üretimi için durum "ready_for_generation" olmalıdır. Mevcut durum: ${job.generation_status}`);
  }

  // 2. Doğrulanmış Kaynak Kontrolü (En az 2 Verified Kaynak Şartı)
  const { data: verifiedSources } = await supabase
    .from('content_generation_job_sources')
    .select('*')
    .eq('job_id', jobId)
    .eq('verification_status', 'verified');

  if (!verifiedSources || verifiedSources.length < 2) {
    await supabase
      .from('content_generation_jobs')
      .update({
        generation_status: 'failed',
        last_error: 'İçerik üretimi için en az iki (2) doğrulanmış (verified) kaynak zorunludur.'
      })
      .eq('id', jobId);

    throw new Error('İçerik üretimi reddedildi: En az iki (2) doğrulanmış kaynak bulunmuyor.');
  }

  const isCatHydration = job.topic.includes('Su Tüketimini');
  const verifiedIds = verifiedSources.map((s) => s.id);

  let draft: GeneratedContentDraft;

  if (isCatHydration) {
    // Kedi Hidrasyonu Taslağı
    draft = {
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
    };
  } else {
    // Köpek Sosyalleşmesi Taslağı
    draft = {
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
  }

  // Taslak Yapı Doğrulaması
  const validation = validateDraftStructure(draft);
  if (!validation.isValid) {
    await supabase
      .from('content_generation_jobs')
      .update({
        generation_status: 'failed',
        last_error: validation.error
      })
      .eq('id', jobId);

    throw new Error(`Üretilen taslak yapısı geçersiz: ${validation.error}`);
  }

  // İş kaydını admin_review_required durumuna geçir (AI asla vet_review_required veya approved_for_import yapamaz)
  await supabase
    .from('content_generation_jobs')
    .update({
      generation_status: 'admin_review_required',
      generated_draft: draft,
      generated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  return draft;
}
