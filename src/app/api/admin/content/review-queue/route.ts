import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content/review-queue
 * Veritabanının tamamı üzerinden kontrol kuyruğu ve içerik kapsama analizini döndürür.
 */
export async function GET(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  // 1. Tüm Makaleleri Çek
  const { data: articles, error: artErr } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (artErr) {
    return NextResponse.json({ error: artErr.message }, { status: 500 });
  }

  // 2. Tüm Aktif Kaynakları Çek
  const { data: sources } = await supabase
    .from('article_sources')
    .select('article_id, is_active')
    .eq('is_active', true);

  const activeSourceArticleIds = new Set((sources || []).map((s) => s.article_id));

  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const expired: any[] = [];
  const dueToday: any[] = [];
  const due30Days: any[] = [];
  const missingReviewDate: any[] = [];
  const missingSources: any[] = [];
  const pendingVetReview: any[] = [];
  const archived: any[] = [];

  const eligiblePublished: any[] = [];

  for (const art of articles || []) {
    if (art.archived_at) {
      archived.push(art);
      continue;
    }

    if (!art.next_review_at) {
      missingReviewDate.push(art);
    } else {
      const reviewDate = new Date(art.next_review_at);
      if (reviewDate < now) {
        expired.push(art);
      } else if (reviewDate <= todayEnd) {
        dueToday.push(art);
      } else if (reviewDate <= in30Days) {
        due30Days.push(art);
      }
    }

    const hasSources = activeSourceArticleIds.has(art.id) || (art.references_list && art.references_list.length > 0);
    if (!hasSources) {
      missingSources.push(art);
    }

    if (art.is_medical_content && art.vet_review_status === 'pending') {
      pendingVetReview.push(art);
    }

    // Kullanıcıya Sunulabilir Güncel & Yayınlanmış Makaleler
    const isFresh = art.content_reviewed_at && art.next_review_at && new Date(art.next_review_at) >= now;
    const isVetApproved = !art.is_medical_content || (art.vet_review_status === 'approved' && hasSources);

    if (art.is_published && isFresh && isVetApproved) {
      eligiblePublished.push(art);
    }
  }

  // 3. İçerik Kapsamı (Coverage Summary) Hesaplama
  const coverageSummary = {
    totalEligible: eligiblePublished.length,
    catCount: eligiblePublished.filter((a) => a.species_filter?.includes('cat')).length,
    dogCount: eligiblePublished.filter((a) => a.species_filter?.includes('dog')).length,
    juniorCatCount: eligiblePublished.filter((a) => a.species_filter?.includes('cat') && a.target_life_stages?.includes('junior')).length,
    juniorDogCount: eligiblePublished.filter((a) => a.species_filter?.includes('dog') && a.target_life_stages?.includes('junior')).length,
    winterCount: eligiblePublished.filter((a) => a.target_seasons?.includes('winter')).length,
    summerCount: eligiblePublished.filter((a) => a.target_seasons?.includes('summer')).length,
    brachyCount: eligiblePublished.filter((a) => a.target_breed_traits?.includes('brachycephalic')).length
  };

  const coverageGaps: string[] = [];
  if (coverageSummary.catCount === 0) coverageGaps.push('Kedilere yönelik güncel içerik yok.');
  if (coverageSummary.dogCount === 0) coverageGaps.push('Köpeklere yönelik güncel içerik yok.');
  if (coverageSummary.juniorCatCount === 0) coverageGaps.push('Yavru kediler için güncel beslenme/bakım içeriği yok.');
  if (coverageSummary.juniorDogCount === 0) coverageGaps.push('Yavru köpekler için güncel eğitim/bakım içeriği yok.');
  if (coverageSummary.winterCount === 0) coverageGaps.push('Kış dönemi kedi/köpek bakımı içeriği yok.');
  if (coverageSummary.summerCount === 0) coverageGaps.push('Yaz dönemi bakımı ve sıcak hava önlemleri içeriği yok.');
  if (coverageSummary.brachyCount === 0) coverageGaps.push('Basık burunlu kediler/köpekler için güncel içerik yok.');

  return NextResponse.json({
    counts: {
      expired: expired.length,
      dueToday: dueToday.length,
      due30Days: due30Days.length,
      missingReviewDate: missingReviewDate.length,
      missingSources: missingSources.length,
      pendingVetReview: pendingVetReview.length,
      archived: archived.length
    },
    groups: {
      expired,
      dueToday,
      due30Days,
      missingReviewDate,
      missingSources,
      pendingVetReview,
      archived
    },
    coverageSummary,
    coverageGaps
  });
}
