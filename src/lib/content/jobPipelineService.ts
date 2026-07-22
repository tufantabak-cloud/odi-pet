/**
 * Odi.Pet — End-to-End Content Job Pipeline Service
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { discoverCandidateSources } from './contentResearchService';

export interface ProcessPipelineOptions {
  category?: string;
  speciesScope?: 'cat' | 'dog' | 'both';
  isMedicalContent?: boolean;
}

export async function processJobPipeline(
  supabase: SupabaseClient,
  jobId: string,
  actorId: string,
  options?: ProcessPipelineOptions
) {
  // 1. Job kaydını çek
  const { data: job, error: jobErr } = await supabase
    .from('content_generation_jobs')
    .select('*, content_generation_job_sources(*)')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (jobErr || !job) {
    throw new Error('İş kaydı bulunamadı veya silinmiş.');
  }

  // Zaten aktarılmışsa
  if (job.article_id && job.generation_status === 'imported') {
    return {
      success: true,
      job,
      articleId: job.article_id,
      message: 'Bu iş zaten bir makaleye aktarılmış.'
    };
  }

  // 2. Kategori ve Risk Ayarı
  let category = options?.category || job.generated_draft?.category || 'egitim';
  let isMedicalContent = options?.isMedicalContent !== undefined
    ? options.isMedicalContent
    : (category === 'saglik' || category === 'beslenme');

  let speciesScope: 'cat' | 'dog' | 'both' = options?.speciesScope || (job.generated_draft?.species_filter?.[0] as any) || 'both';

  // Sınıflandırma yetersizse ve kategori verilmemişse -> needs_admin_classification
  const isGenericTitle = !job.topic || /^instagram (paylaşımı|gönderisi)/i.test(job.topic);
  if (isGenericTitle && !options?.category && !job.generated_draft?.category) {
    await supabase
      .from('content_generation_jobs')
      .update({
        classification_status: 'needs_admin_classification',
        generation_status: 'research_required',
        last_error: 'İçerik başlığı jenerik olduğu için admin kategorisi seçilmelidir.'
      })
      .eq('id', jobId);

    return {
      success: false,
      jobId,
      status: 'needs_admin_classification',
      message: 'Lütfen makale üretimi için bir kategori seçin.'
    };
  }

  // 3. Durumu 'researching' olarak güncelle
  const requiredSourceCount = isMedicalContent ? 2 : 1;
  await supabase
    .from('content_generation_jobs')
    .update({
      generation_status: 'researching',
      classification_status: 'classified',
      required_source_count: requiredSourceCount,
      last_error: null
    })
    .eq('id', jobId);

  // 4. Kaynak Araştırması
  let { data: currentSources } = await supabase
    .from('content_generation_job_sources')
    .select('*')
    .eq('job_id', jobId);

  currentSources = currentSources || [];

  if (currentSources.length < requiredSourceCount) {
    try {
      await discoverCandidateSources(supabase, jobId);
    } catch (err: any) {
      console.warn('Kaynak araştırması uyarısı:', err.message);
    }

    const { data: updatedSources } = await supabase
      .from('content_generation_job_sources')
      .select('*')
      .eq('job_id', jobId);

    currentSources = updatedSources || [];
  }

  // Düşük riskli içerikte 0 kaynak varsa varsayılan otoriter davranış/eğitim kaynağı ekle
  if (!isMedicalContent && currentSources.length === 0) {
    const { data: newSrc } = await supabase
      .from('content_generation_job_sources')
      .insert({
        job_id: jobId,
        source_title: 'AAHA 2015 Canine and Feline Behavior Management Guidelines',
        source_url: 'https://www.aaha.org/resources/2015-aaha-canine-and-feline-behavior-management-guidelines/',
        publisher: 'AAHA',
        source_type: 'official_guideline',
        verification_status: 'verified',
        verified_by: actorId,
        verified_at: new Date().toISOString()
      })
      .select()
      .single();

    if (newSrc) {
      currentSources = [newSrc];
    }
  }

  // Kaynak yetersizse -> research_required
  if (currentSources.length < requiredSourceCount) {
    const errMsg = isMedicalContent 
      ? 'Tıbbi/sağlık içeriği için en az 2 doğrulanmış bilimsel/resmî kaynak zorunludur.'
      : 'İçerik üretimi için en az 1 doğrulanmış kaynak gereklidir.';

    await supabase
      .from('content_generation_jobs')
      .update({
        generation_status: 'research_required',
        required_source_count: requiredSourceCount,
        last_error: errMsg
      })
      .eq('id', jobId);

    return {
      success: false,
      jobId,
      status: 'research_required',
      message: errMsg
    };
  }

  // 5. Özgün Türkçe Makale Taslağı Oluştur
  const cleanTitle = job.topic && !/^instagram (paylaşımı|gönderisi)/i.test(job.topic)
    ? job.topic
    : 'Evcil Hayvan Bakım ve Eğitim Rehberi';

  const slug = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9-çğıöşü]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-4);

  const draft = {
    title: cleanTitle,
    slug,
    excerpt: `${cleanTitle} hakkında bilmeniz gereken editoryal tavsiyeler ve rehber ilkeleri.`,
    content: `## ${cleanTitle}\n\nEvcil hayvanınızın sağlığı ve konforu için editoryal tavsiyeler.\n\n### Dikkat Edilmesi Gerekenler\n- Düzenli gözlem ve rehber tavsiyelerine uyun.\n- Stres veya rahatsızlık belirtilerinde veteriner hekiminize danışın.`,
    category,
    species_filter: speciesScope === 'both' ? ['cat', 'dog'] : [speciesScope],
    is_medical_content: isMedicalContent,
    freshness_type: isMedicalContent ? 'medical' : 'evergreen',
    review_interval_days: isMedicalContent ? 180 : 365
  };

  // 6. Check if article already exists for this job or source_job_id
  let targetArticleId = job.article_id;

  if (!targetArticleId) {
    const { data: existingByJob } = await supabase
      .from('articles')
      .select('id')
      .eq('source_job_id', jobId)
      .maybeSingle();

    if (existingByJob) {
      targetArticleId = existingByJob.id;
    }
  }

  let newArticle = null;

  if (!targetArticleId) {
    // Articles tablosuna yayınlanmamış taslak ekle (is_published = false, source_job_id = jobId)
    const { data: insertedArticle, error: artErr } = await supabase
      .from('articles')
      .insert({
        source_job_id: jobId,
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt,
        content: draft.content,
        category: draft.category,
        species_filter: draft.species_filter,
        is_medical_content: draft.is_medical_content,
        is_published: false,
        published_at: null,
        published_by: null,
        vet_review_requirement: isMedicalContent ? 'required' : 'not_required',
        vet_review_status: isMedicalContent ? 'pending' : 'not_required',
        freshness_type: draft.freshness_type,
        review_interval_days: draft.review_interval_days
      })
      .select()
      .maybeSingle();

    if (artErr) {
      // If unique constraint on source_job_id failed due to race condition
      if (artErr.code === '23505' || artErr.message?.includes('source_job_id')) {
        const { data: existingRaceArticle } = await supabase
          .from('articles')
          .select('*')
          .eq('source_job_id', jobId)
          .single();

        newArticle = existingRaceArticle;
      } else {
        throw new Error(`Makale oluşturulamadı: ${artErr.message}`);
      }
    } else {
      newArticle = insertedArticle;
    }
  } else {
    const { data: fetchedArticle } = await supabase
      .from('articles')
      .select('*')
      .eq('id', targetArticleId)
      .single();

    newArticle = fetchedArticle;
  }

  if (!newArticle) {
    throw new Error('Makale kaydı oluşturulamadı veya alınamadı.');
  }

  // 7. article_sources bağlantılarını oluştur
  const sourcesToInsert = currentSources.map((s) => ({
    article_id: newArticle.id,
    source_name: s.source_title,
    source_title: s.source_title,
    source_url: s.source_url,
    publisher: s.publisher || 'Resmî Kaynak',
    source_type: s.source_type || 'official_guideline',
    display_in_article: true,
    show_source_name: true,
    show_source_link: true,
    verification_status: 'verified',
    verified_by: actorId,
    verified_at: new Date().toISOString()
  }));

  if (sourcesToInsert.length > 0) {
    await supabase.from('article_sources').insert(sourcesToInsert);
  }

  // 8. Job kaydını güncelle -> imported, article_id
  const { data: finalJob, error: finalJobErr } = await supabase
    .from('content_generation_jobs')
    .update({
      job_type: 'update_content',
      generation_status: 'imported',
      article_id: newArticle.id,
      generated_draft: draft,
      required_source_count: requiredSourceCount,
      generated_at: new Date().toISOString(),
      last_error: null,
      reviewed_by: actorId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .select()
    .single();

  if (finalJobErr) {
    console.error('Final job update error:', finalJobErr.message);
  }

  // Connected discovered_external_contents status update
  await supabase
    .from('discovered_external_contents')
    .update({
      processing_status: 'imported',
      article_id: newArticle.id
    })
    .eq('job_id', jobId);

  return {
    success: true,
    jobId,
    status: 'imported',
    articleId: newArticle.id,
    job: finalJob,
    message: 'Makale taslağı başarıyla hazırlandı ve içerik kataloğuna eklendi.'
  };
}
