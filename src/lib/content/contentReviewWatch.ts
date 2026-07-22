/**
 * Odi.Pet — Daily Content Review Watch Utility
 * Günlük içerik güncellik ve kontrol takibi mantığı.
 * İçerikleri otomatik değiştirmez, dışarıdan metin çekmez, mükerrer kayıt üretmez.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ContentReviewWatchResult {
  runAt: string;
  counts: {
    expired: number;
    due30Days: number;
    missingSources: number;
    pendingVetReview: number;
    archived: number;
  };
  summaryAlerts: string[];
}

export async function runContentReviewWatch(
  supabase: SupabaseClient
): Promise<ContentReviewWatchResult> {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Tüm Makaleleri Çek
  const { data: articles, error: artErr } = await supabase
    .from('articles')
    .select('id, title, is_published, is_medical_content, vet_review_status, next_review_at, archived_at, references_list');

  if (artErr) {
    throw new Error(`Content review watch error: ${artErr.message}`);
  }

  // 2. Aktif Kaynakları Çek
  const { data: sources } = await supabase
    .from('article_sources')
    .select('article_id')
    .eq('is_active', true);

  const activeSourceArticleIds = new Set((sources || []).map((s) => s.article_id));

  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let expiredCount = 0;
  let due30DaysCount = 0;
  let missingSourcesCount = 0;
  let pendingVetCount = 0;
  let archivedCount = 0;

  for (const art of articles || []) {
    if (art.archived_at) {
      archivedCount++;
      continue;
    }

    if (art.next_review_at) {
      const rDate = new Date(art.next_review_at);
      if (rDate < now) {
        expiredCount++;
      } else if (rDate <= in30Days) {
        due30DaysCount++;
      }
    }

    const hasSources =
      activeSourceArticleIds.has(art.id) ||
      (art.references_list && Array.isArray(art.references_list) && art.references_list.length > 0);

    if (!hasSources && art.is_published) {
      missingSourcesCount++;
    }

    if (art.is_medical_content && art.vet_review_status === 'pending') {
      pendingVetCount++;
    }
  }

  const summaryAlerts: string[] = [];
  if (expiredCount > 0) {
    summaryAlerts.push(`${expiredCount} içeriğin kontrol süresi geçti`);
  }
  if (due30DaysCount > 0) {
    summaryAlerts.push(`${due30DaysCount} içerik önümüzdeki 30 gün içinde kontrol edilmeli`);
  }
  if (missingSourcesCount > 0) {
    summaryAlerts.push(`${missingSourcesCount} içerikte aktif kaynak bulunmuyor`);
  }
  if (pendingVetCount > 0) {
    summaryAlerts.push(`${pendingVetCount} tıbbi içerik veteriner onayı bekliyor`);
  }

  return {
    runAt: nowIso,
    counts: {
      expired: expiredCount,
      due30Days: due30DaysCount,
      missingSources: missingSourcesCount,
      pendingVetReview: pendingVetCount,
      archived: archivedCount
    },
    summaryAlerts
  };
}
