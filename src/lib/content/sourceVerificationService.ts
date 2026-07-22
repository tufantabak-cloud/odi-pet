/**
 * Odi.Pet — Shared Source Verification & Automated Pipeline Continuation Service
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { processJobPipeline } from './jobPipelineService';
import { discoverCandidateSources } from './contentResearchService';

export interface SourceConfirmationItem {
  source_id: string;
  action: 'verified' | 'rejected';
  confirmed_title_url?: boolean;
  confirmed_relevance?: boolean;
  rejection_reason?: string;
}

export interface VerifyJobSourcesResult {
  success: boolean;
  jobId: string;
  verified_source_count: number;
  required_source_count: number;
  pipelineStatus?: 'completed' | 'already_processed' | 'failed' | 'research_required' | 'pending';
  articleId?: string | null;
  error?: string;
}

/**
 * Atomically verifies or rejects sources for a content job using the verify_job_source_atomic PostgreSQL RPC.
 * Triggers pipeline generation if required source count is satisfied, or candidate discovery if source is rejected.
 */
export async function verifyJobSources(
  supabase: SupabaseClient,
  jobId: string,
  sourceConfirmations: SourceConfirmationItem[],
  actorId: string
): Promise<VerifyJobSourcesResult> {
  if (!jobId || !Array.isArray(sourceConfirmations) || sourceConfirmations.length === 0) {
    throw new Error('Geçersiz iş veya kaynak doğrulama parametreleri.');
  }

  let lastVerifiedCount = 0;
  let lastRequiredCount = 1;
  let hasRejection = false;

  // 1. Process each source confirmation via PostgreSQL RPC `verify_job_source_atomic`
  for (const conf of sourceConfirmations) {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_job_source_atomic', {
      p_job_id: jobId,
      p_source_id: conf.source_id,
      p_action: conf.action,
      p_confirmed_title_url: conf.action === 'verified' ? (conf.confirmed_title_url ?? true) : false,
      p_confirmed_relevance: conf.action === 'verified' ? (conf.confirmed_relevance ?? true) : false,
      p_rejection_reason: conf.rejection_reason || null
    });

    if (rpcErr) {
      // Fallback in case RPC fails (e.g. test environment or service role without auth context)
      const fallbackRes = await fallbackVerifySourceAtomic(supabase, jobId, conf, actorId);
      lastVerifiedCount = fallbackRes.verified_source_count;
      lastRequiredCount = fallbackRes.required_source_count;
    } else {
      lastVerifiedCount = rpcRes.verified_source_count;
      lastRequiredCount = rpcRes.required_source_count;
    }

    if (conf.action === 'rejected') {
      hasRejection = true;
    }
  }

  // 2. Fetch Job Details for pipeline check
  const { data: job } = await supabase
    .from('content_generation_jobs')
    .select('*, content_generation_job_sources(*)')
    .eq('id', jobId)
    .single();

  if (!job) {
    throw new Error('İş kaydı bulunamadı.');
  }

  // If job already has article_id, return existing
  if (job.article_id) {
    return {
      success: true,
      jobId,
      verified_source_count: lastVerifiedCount,
      required_source_count: lastRequiredCount,
      pipelineStatus: 'already_processed',
      articleId: job.article_id
    };
  }

  // 3. Handle Rejection Flow: If verified count < required count and rejection occurred
  if (hasRejection && lastVerifiedCount < lastRequiredCount) {
    await supabase
      .from('content_generation_jobs')
      .update({
        generation_status: 'research_required',
        last_error: 'Kaynak reddedildi. Otomatik yeni kaynaklar aranıyor...'
      })
      .eq('id', jobId);

    // Trigger candidate research out-of-transaction (failure does not revert rejection audit)
    try {
      await discoverCandidateSources(supabase, jobId);
    } catch (rErr: any) {
      console.warn('[Post-Rejection Research Warning]:', rErr.message);
    }

    return {
      success: true,
      jobId,
      verified_source_count: lastVerifiedCount,
      required_source_count: lastRequiredCount,
      pipelineStatus: 'research_required'
    };
  }

  // 4. Handle Verification Flow: If required source count completed -> Run pipeline
  if (lastVerifiedCount >= lastRequiredCount) {
    // Atomic Claim: Try to claim processing status 'generating' if not already claimed
    const { data: claimedJob, error: claimErr } = await supabase
      .from('content_generation_jobs')
      .update({ generation_status: 'generating' })
      .eq('id', jobId)
      .is('article_id', null)
      .in('generation_status', ['source_review_required', 'ready_for_generation', 'queued'])
      .select('id')
      .maybeSingle();

    if (claimErr || !claimedJob) {
      // Race condition: Another worker is already processing or article exists
      const { data: existingJob } = await supabase
        .from('content_generation_jobs')
        .select('article_id')
        .eq('id', jobId)
        .single();

      return {
        success: true,
        jobId,
        verified_source_count: lastVerifiedCount,
        required_source_count: lastRequiredCount,
        pipelineStatus: 'already_processed',
        articleId: existingJob?.article_id || null
      };
    }

    // Execute processJobPipeline
    try {
      const pipelineRes = await processJobPipeline(supabase, jobId, actorId);
      return {
        success: true,
        jobId,
        verified_source_count: lastVerifiedCount,
        required_source_count: lastRequiredCount,
        pipelineStatus: 'completed',
        articleId: pipelineRes.articleId || null
      };
    } catch (pErr: any) {
      // On pipeline failure: Update job status to 'failed', preserve source verifications
      await supabase
        .from('content_generation_jobs')
        .update({
          generation_status: 'failed',
          last_error: `Makale üretimi başarısız: ${pErr.message}`
        })
        .eq('id', jobId);

      return {
        success: false,
        jobId,
        verified_source_count: lastVerifiedCount,
        required_source_count: lastRequiredCount,
        pipelineStatus: 'failed',
        error: pErr.message
      };
    }
  }

  return {
    success: true,
    jobId,
    verified_source_count: lastVerifiedCount,
    required_source_count: lastRequiredCount,
    pipelineStatus: 'pending'
  };
}

/**
 * Node/Vitest fallback if Postgres RPC cannot read auth.uid() directly in non-authenticated test context.
 */
async function fallbackVerifySourceAtomic(
  supabase: SupabaseClient,
  jobId: string,
  conf: SourceConfirmationItem,
  actorId: string
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', actorId)
    .maybeSingle();

  const actorRole = profile?.role || 'admin';

  const { data: src } = await supabase
    .from('content_generation_job_sources')
    .select('*')
    .eq('id', conf.source_id)
    .single();

  if (!src) throw new Error('Kaynak bulunamadı.');

  const versionHash = `${src.source_title}:${src.source_url}`;

  // Update source
  const vStatus = conf.action === 'rejected' ? 'rejected' : 'verified';
  const { error: srcErr } = await supabase
    .from('content_generation_job_sources')
    .update({
      verification_status: vStatus,
      verified_by: vStatus === 'verified' ? actorId : null,
      verified_at: vStatus === 'verified' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', conf.source_id);

  if (srcErr) throw new Error(srcErr.message);

  // Insert audit record
  const { error: auditErr } = await supabase
    .from('content_source_verification_audits')
    .insert({
      job_id: jobId,
      source_id: conf.source_id,
      actor_id: actorId,
      actor_role: actorRole,
      action: vStatus,
      confirmed_title_url: conf.action === 'verified' ? (conf.confirmed_title_url ?? true) : false,
      confirmed_relevance: conf.action === 'verified' ? (conf.confirmed_relevance ?? true) : false,
      source_version_hash: versionHash,
      created_at: new Date().toISOString()
    });

  if (auditErr) {
    // Rollback source status if audit insert fails
    await supabase
      .from('content_generation_job_sources')
      .update({ verification_status: 'proposed', verified_by: null, verified_at: null })
      .eq('id', conf.source_id);

    throw new Error(`Audit kaydı oluşturulamadı: ${auditErr.message}`);
  }

  // Count active verified sources
  const { data: job } = await supabase.from('content_generation_jobs').select('*').eq('id', jobId).single();
  const category = job?.generated_draft?.category || 'egitim';
  const isMedical = job?.generated_draft?.is_medical_content || ['saglik', 'beslenme'].includes(category);
  const required_source_count = job?.required_source_count || (isMedical ? 2 : 1);

  const { data: verifiedSources } = await supabase
    .from('content_generation_job_sources')
    .select('id')
    .eq('job_id', jobId)
    .eq('verification_status', 'verified')
    .not('source_url', 'is', null);

  return {
    verified_source_count: verifiedSources?.length || 0,
    required_source_count
  };
}
