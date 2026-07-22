import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { generateDraftFromVerifiedSources } from '@/lib/agents/aiContentAgent';
import { discoverCandidateSources, inspectCandidateSource } from '@/lib/content/contentResearchService';
import { validateStateTransition, ActorRole, JobStatus } from '@/lib/content/contentJobStateMachine';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/content/jobs/[id]
 * İşi günceller, kaynak doğrular, taslak üretir veya açık aksiyonla makaleye aktarır (import_generated_draft_to_article).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { id: jobId } = await params;
  const supabase = await createServerSupabaseClient();

  try {
    const body = await req.json();
    const { action, source_id, verification_status, rejection_reason } = body;

    // 1. İş Kaydını Çek
    const { data: job, error: jobErr } = await supabase
      .from('content_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'İş kaydı bulunamadı.' }, { status: 404 });
    }

    // State Machine Doğrulaması (Generic 'import' vb. reddedilir)
    const actorRole: ActorRole = actor.role === 'founder' ? 'founder_human' : 'admin_human';
    const transitionCheck = validateStateTransition(action, job.generation_status as JobStatus, actorRole);
    if (!transitionCheck.isValid) {
      return NextResponse.json({ error: transitionCheck.error }, { status: 400 });
    }

    // A. Araştırmayı Başlat
    if (action === 'start_research') {
      const res = await discoverCandidateSources(supabase, jobId);
      return NextResponse.json(res);
    }

    // B. Kaynağı İncele
    if (action === 'inspect_source' && source_id) {
      const res = await inspectCandidateSource(supabase, jobId, source_id);
      return NextResponse.json(res);
    }

    // C. Üretime Hazır Olarak İşaretle
    if (action === 'mark_ready_for_generation') {
      const { data: verifiedCount } = await supabase
        .from('content_generation_job_sources')
        .select('id')
        .eq('job_id', jobId)
        .eq('verification_status', 'verified');

      if (!verifiedCount || verifiedCount.length < 2) {
        return NextResponse.json({ error: 'Üretime hazır olması için en az iki (2) doğrulanmış kaynak şarttır.' }, { status: 400 });
      }

      const { data: updatedJob } = await supabase
        .from('content_generation_jobs')
        .update({ generation_status: 'ready_for_generation' })
        .eq('id', jobId)
        .select()
        .single();

      return NextResponse.json(updatedJob);
    }

    // D. Kaynak Doğrulama / Reddetme
    if (action === 'verify_source' && source_id) {
      if (!actor || !actor.id || actor.id === '00000000-0000-0000-0000-000000000001') {
        return NextResponse.json({ error: 'Geçersiz veya sahte kullanıcı oturumu. İnsan doğrulaması kanıtlanamadı.' }, { status: 403 });
      }

      if (body.confirmed_title_url !== true || body.confirmed_relevance !== true) {
        return NextResponse.json({ error: 'Doğrulama öncesinde iki onay kutusu da işaretlenmiş olmalıdır.' }, { status: 400 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', actor.id)
        .single();

      if (!profile || !['admin', 'founder'].includes(profile.role)) {
        return NextResponse.json({ error: 'Kaynak doğrulama yalnız gerçek ve yetkili admin/founder profilleri tarafından yapılabilir.' }, { status: 403 });
      }

      const vStatus = verification_status === 'rejected' ? 'rejected' : 'verified';
      const { data: updatedSource, error: srcErr } = await supabase
        .from('content_generation_job_sources')
        .update({
          verification_status: vStatus,
          verified_by: actor.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', source_id)
        .select()
        .single();

      if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 400 });

      await supabase.from('content_source_verification_audits').insert({
        job_id: jobId,
        source_id: source_id,
        actor_id: actor.id,
        actor_role: profile.role,
        action: vStatus,
        confirmed_title_url: true,
        confirmed_relevance: true,
        created_at: new Date().toISOString()
      });

      const { data: verifiedSources } = await supabase
        .from('content_generation_job_sources')
        .select('id')
        .eq('job_id', jobId)
        .eq('verification_status', 'verified');

      if (verifiedSources && verifiedSources.length >= 2 && job.generation_status === 'source_review_required') {
        await supabase
          .from('content_generation_jobs')
          .update({ generation_status: 'ready_for_generation' })
          .eq('id', jobId);
      }

      return NextResponse.json({ source: updatedSource });
    }

    // E. Taslak Üretimini Tetikle
    if (action === 'generate_draft') {
      const updatedJob = await generateDraftFromVerifiedSources(supabase, jobId);
      return NextResponse.json(updatedJob);
    }

    // F. İşi Reddet
    if (action === 'reject' || action === 'reject_job') {
      const { data: rejectedJob } = await supabase
        .from('content_generation_jobs')
        .update({
          generation_status: 'rejected',
          reviewed_by: actor.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejection_reason || 'Admin tarafından reddedildi.'
        })
        .eq('id', jobId)
        .select()
        .single();

      return NextResponse.json(rejectedJob);
    }

    // G. AÇIK MAKALEYE AKTARIM (Idempotent: import_generated_draft_to_article / import_as_draft)
    if (action === 'import_generated_draft_to_article' || action === 'import_as_draft') {
      const draft = job.generated_draft;

      // 1. Zaten Bağlı Article veya Var olan Slug/Title Kontrolü
      let existingArticleId = job.article_id;

      if (!existingArticleId && draft?.title) {
        const { data: foundArticle } = await supabase
          .from('articles')
          .select('id')
          .ilike('title', draft.title.trim())
          .maybeSingle();

        if (foundArticle) {
          existingArticleId = foundArticle.id;
        }
      }

      // Var olan makaleye bağla (Mükerrer OLUŞTURMA!)
      if (existingArticleId) {
        const { data: updatedJob } = await supabase
          .from('content_generation_jobs')
          .update({
            job_type: 'update_content',
            article_id: existingArticleId,
            generation_status: 'imported',
            last_error: null
          })
          .eq('id', jobId)
          .select()
          .single();

        return NextResponse.json({
          message: 'Bu içerik daha önce makaleye aktarılmış.',
          article_id: existingArticleId,
          job: updatedJob
        });
      }

      if (!draft || !draft.title) {
        return NextResponse.json({ error: 'Aktarılacak geçerli taslak bulunamadı.' }, { status: 400 });
      }

      const isMedical = Boolean(draft.is_medical_content);
      const cleanSlug = (draft.title || job.topic)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

      // 2. Yeni Articles Kaydı Oluştur (is_published = false)
      const { data: newArticle, error: artErr } = await supabase
        .from('articles')
        .insert({
          title: draft.title,
          slug: `${cleanSlug}-${Date.now().toString().slice(-4)}`,
          content: draft.content,
          category: draft.category || 'genel',
          species_filter: draft.species_filter || ['cat', 'dog'],
          is_medical_content: isMedical,
          vet_review_status: isMedical ? 'pending' : 'not_required',
          is_published: false,
          freshness_type: draft.freshness_type || 'evergreen',
          review_interval_days: draft.review_interval_days || 365,
          content_reviewed_at: new Date().toISOString(),
          content_reviewed_by: actor.id,
          source_checked_at: new Date().toISOString(),
          next_review_at: new Date(Date.now() + (draft.review_interval_days || 365) * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (artErr) {
        return NextResponse.json({ error: artErr.message }, { status: 400 });
      }

      // 3. Verified kaynakları article_sources tablosuna bağla
      const { data: verifiedSources } = await supabase
        .from('content_generation_job_sources')
        .select('*')
        .eq('job_id', jobId)
        .eq('verification_status', 'verified');

      if (verifiedSources && verifiedSources.length > 0) {
        const articleSourcesInsert = verifiedSources.map((s) => ({
          article_id: newArticle.id,
          source_title: s.source_title,
          source_url: s.source_url,
          publisher: s.publisher,
          source_type: s.source_type,
          is_active: true,
          created_by: actor.id
        }));

        await supabase.from('article_sources').insert(articleSourcesInsert);
      }

      // 4. İşi imported olarak kapat ve last_error = null yap
      const { data: importedJob } = await supabase
        .from('content_generation_jobs')
        .update({
          job_type: 'update_content',
          generation_status: 'imported',
          article_id: newArticle.id,
          last_error: null,
          reviewed_by: actor.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single();

      return NextResponse.json({
        message: 'Makale taslağı oluşturuldu.',
        article_id: newArticle.id,
        job: importedJob
      });
    }

    return NextResponse.json({ error: 'Geçersiz aksiyon.' }, { status: 400 });
  } catch (err: any) {
    console.error('Content Job API Error:', err);
    return NextResponse.json({ error: err.message || 'Sunucu hatası.' }, { status: 500 });
  }
}
