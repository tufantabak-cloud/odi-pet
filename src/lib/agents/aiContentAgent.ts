/**
 * Odi.Pet — Guarded AI Content Agent
 * Güvenli AI İçerik Taslağı Üretim ve Yönetim Ajanı.
 * 
 * Güvenlik Kuralları:
 * - Doğrulanmamış kaynak ile içerik üretemez.
 * - Otomatik yayınlama (is_published: true) yapamaz.
 * - Veteriner onayı (vet_review_status: 'approved') veremez.
 * - Sadece ready_for_generation ve verified kaynak mevcudiyetinde taslak üretebilir.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ProposedSourceInput {
  source_title: string;
  source_url?: string;
  publisher?: string;
  source_type?: 'official' | 'veterinary_guideline' | 'scientific' | 'manufacturer' | 'reputable_editorial';
  source_excerpt?: string;
}

export interface CreateJobInput {
  job_type: 'new_content' | 'update_content';
  topic: string;
  article_id?: string | null;
  proposed_targeting?: any;
  proposed_sources?: ProposedSourceInput[];
}

export interface GeneratedDraftSchema {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  species_filter: string[];
  target_life_stages?: string[];
  target_breed_traits?: string[];
  target_seasons?: string[];
  is_medical_content: boolean;
  freshness_type: 'evergreen' | 'seasonal' | 'medical' | 'product_regulatory';
  review_interval_days: number;
  source_claims: Array<{ claim: string; source_title: string }>;
  safety_notes?: string;
}

/**
 * 1. createContentJob
 * Yeni içerik veya güncelleme işi oluşturur. Mükerrer açık iş engeli mevcuttur.
 */
export async function createContentJob(
  supabase: SupabaseClient,
  input: CreateJobInput
) {
  const { job_type, topic, article_id, proposed_targeting, proposed_sources } = input;
  const cleanTopic = topic.trim();

  // Validasyonlar
  if (job_type === 'update_content' && !article_id) {
    throw new Error('Güncelleme işleri (update_content) için article_id zorunludur.');
  }
  if (job_type === 'new_content' && article_id) {
    throw new Error('Yeni içerik işleri (new_content) için article_id boş olmalıdır.');
  }

  // Mükerrer Açık İş Kontrolü
  if (job_type === 'update_content') {
    const { data: openUpdate } = await supabase
      .from('content_generation_jobs')
      .select('id')
      .eq('article_id', article_id)
      .not('generation_status', 'in', '("imported","rejected","failed")')
      .maybeSingle();

    if (openUpdate) {
      return { job: openUpdate, isDuplicate: true };
    }
  } else {
    const { data: openNew } = await supabase
      .from('content_generation_jobs')
      .select('id')
      .eq('job_type', 'new_content')
      .ilike('topic', cleanTopic)
      .not('generation_status', 'in', '("imported","rejected","failed")')
      .maybeSingle();

    if (openNew) {
      return { job: openNew, isDuplicate: true };
    }
  }

  const initialStatus = proposed_sources && proposed_sources.length > 0 ? 'source_review_required' : 'research_required';

  const { data: job, error: jobErr } = await supabase
    .from('content_generation_jobs')
    .insert({
      job_type,
      article_id: article_id || null,
      topic: cleanTopic,
      generation_status: initialStatus,
      proposed_targeting: proposed_targeting || {},
      generated_by: 'ai_content_agent'
    })
    .select()
    .single();

  if (jobErr) throw jobErr;

  // Taslak kaynakları ekle (proposed)
  if (proposed_sources && proposed_sources.length > 0) {
    const sourceInserts = proposed_sources.map((s) => ({
      job_id: job.id,
      source_title: s.source_title,
      source_url: s.source_url || null,
      publisher: s.publisher || null,
      source_type: s.source_type || 'scientific',
      verification_status: 'proposed', // AI asla verified yapamaz
      source_excerpt: s.source_excerpt || null
    }));

    await supabase.from('content_generation_job_sources').insert(sourceInserts);
  }

  return { job, isDuplicate: false };
}

/**
 * 2. validateDraftStructure
 * AI tarafından üretilen taslağın şemasını ve güvenlik kurallarını doğrular.
 */
export function validateDraftStructure(draft: any): { isValid: boolean; error?: string } {
  if (!draft || typeof draft !== 'object') {
    return { isValid: false, error: 'Geçersiz taslak formatı: Obje bekleniyor.' };
  }

  if (!draft.title || typeof draft.title !== 'string' || !draft.title.trim()) {
    return { isValid: false, error: 'Taslak başlığı (title) zorunludur.' };
  }

  if (!draft.excerpt || !draft.content) {
    return { isValid: false, error: 'Taslak özeti (excerpt) ve içeriği (content) zorunludur.' };
  }

  // Tür Hedefleme Kontrolü
  if (!draft.species_filter || !Array.isArray(draft.species_filter) || draft.species_filter.length === 0) {
    return { isValid: false, error: 'Görünürlük için en az bir hedef tür (species_filter) seçilmelidir.' };
  }

  const validSpecies = ['cat', 'dog'];
  const hasInvalidSpecies = draft.species_filter.some((s: string) => !validSpecies.includes(s));
  if (hasInvalidSpecies) {
    return { isValid: false, error: 'Geçersiz tür filtresi: Yalnızca cat ve dog desteklenir.' };
  }

  // Tıbbi İçerik ve Kaynak Eşleşme Kontrolü
  if (draft.is_medical_content) {
    if (!draft.source_claims || !Array.isArray(draft.source_claims) || draft.source_claims.length === 0) {
      return { isValid: false, error: 'Tıbbi içerikler için kaynak iddiası (source_claims) eşleştirmesi zorunludur.' };
    }
  }

  return { isValid: true };
}

/**
 * 3. generateDraftFromVerifiedSources
 * Yalnızca ready_for_generation VE en az 1 verified kaynak durumunda taslak üretir.
 */
export async function generateDraftFromVerifiedSources(
  supabase: SupabaseClient,
  jobId: string,
  providedDraftOverride?: Partial<GeneratedDraftSchema>
) {
  // İş Kaydını Çek
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

  // Doğrulanmış Kaynak Kontrolü (En az 2 Verified Kaynak Şartı)
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

  // Tıbbi İçerikte Uygun Kaynak Türü Kontrolü
  const isMedicalTarget = Boolean(job.proposed_targeting?.is_medical_content);
  if (isMedicalTarget) {
    const validMedicalTypes = ['veterinary_guideline', 'scientific', 'official'];
    const hasValidMedicalSource = verifiedSources.some((s) => validMedicalTypes.includes(s.source_type));
    if (!hasValidMedicalSource) {
      await supabase
        .from('content_generation_jobs')
        .update({
          generation_status: 'failed',
          last_error: 'Tıbbi içerik üretimi için en az bir veteriner hekimliği, bilimsel veya resmi kaynak zorunludur.'
        })
        .eq('id', jobId);

      throw new Error('Tıbbi içerik üretimi reddedildi: Uygun medikal kaynak türü bulunmuyor.');
    }
  }

  // Taslak Nesnesi Yapılandırma
  const mockGeneratedDraft: GeneratedDraftSchema = {
    title: providedDraftOverride?.title || `${job.topic} Rehberi`,
    excerpt: providedDraftOverride?.excerpt || `${job.topic} hakkında uzman tavsiyeleri ve bakım ipuçları.`,
    content: providedDraftOverride?.content || `${job.topic} detaylı analiz metni ve uygulama önerileri.`,
    category: providedDraftOverride?.category || 'genel',
    species_filter: providedDraftOverride?.species_filter || ['cat', 'dog'],
    target_life_stages: providedDraftOverride?.target_life_stages || [],
    target_breed_traits: providedDraftOverride?.target_breed_traits || [],
    target_seasons: providedDraftOverride?.target_seasons || [],
    is_medical_content: providedDraftOverride?.is_medical_content ?? false,
    freshness_type: providedDraftOverride?.freshness_type || 'evergreen',
    review_interval_days: providedDraftOverride?.review_interval_days || 365,
    source_claims: providedDraftOverride?.source_claims || [
      { claim: `${job.topic} için bilimsel kanıt`, source_title: verifiedSources[0].source_title }
    ],
    safety_notes: providedDraftOverride?.safety_notes || 'Bilgilendirme amaçlıdır.'
  };

  // Doğrulama
  const validation = validateDraftStructure(mockGeneratedDraft);
  if (!validation.isValid) {
    await supabase
      .from('content_generation_jobs')
      .update({
        generation_status: 'failed',
        last_error: validation.error
      })
      .eq('id', jobId);

    throw new Error(`Taslak doğrulaması başarısız: ${validation.error}`);
  }

  const nextStatus = mockGeneratedDraft.is_medical_content ? 'vet_review_required' : 'admin_review_required';

  const { data: updatedJob, error: updateErr } = await supabase
    .from('content_generation_jobs')
    .update({
      generated_draft: mockGeneratedDraft,
      generation_status: nextStatus,
      generated_at: new Date().toISOString(),
      generation_attempts: (job.generation_attempts || 0) + 1,
      last_error: null
    })
    .eq('id', jobId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  return updatedJob;
}

/**
 * 4. prepareUpdateComparison
 * Güncelleme işlerinde mevcut makale ile yeni taslağı kıyaslar.
 */
export function prepareUpdateComparison(existingArticle: any, newDraft: any): string {
  const changes: string[] = [];
  if (existingArticle.title !== newDraft.title) {
    changes.push(`Başlık güncellendi: "${existingArticle.title}" ➔ "${newDraft.title}"`);
  }
  if (existingArticle.category !== newDraft.category) {
    changes.push(`Kategori değişti: ${existingArticle.category} ➔ ${newDraft.category}`);
  }
  if (existingArticle.is_medical_content !== newDraft.is_medical_content) {
    changes.push(`Tıbbi durum güncellendi: ${newDraft.is_medical_content ? 'Tıbbi İçerik Yapıldı' : 'Genel İçerik Yapıldı'}`);
  }
  return changes.length > 0 ? changes.join(' | ') : 'İçerik metni ve güncellik detayları tazelendi.';
}
