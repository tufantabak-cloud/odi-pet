import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseInstagramUrl, fetchInstagramOembedInfo } from '@/lib/content/instagramOembedService';
import { validateWebUrl, fetchWebPageInfo, fetchFeedContent, generateContentHash } from '@/lib/content/webFeedService';
import { classifyDiscoveredContent } from '@/lib/content/sourceContentClassifier';
import { generateDraftFromMonitoredSource } from '@/lib/content/sourceArticleGenerator';

/**
 * GET /api/admin/content/monitored-sources
 * Admin ve Founder için takip kaynaklarını ve keşfedilen içerikleri getirir.
 */
export async function GET() {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim. Yalnız admin ve founder erişebilir.' }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  const [{ data: sources, error: srcErr }, { data: discovered, error: discErr }] = await Promise.all([
    supabase.from('monitored_sources').select('*').order('created_at', { ascending: false }),
    supabase.from('discovered_external_contents').select('*').order('created_at', { ascending: false }).limit(50)
  ]);

  if (srcErr) {
    return NextResponse.json({ error: srcErr.message }, { status: 400 });
  }

  return NextResponse.json({
    sources: sources || [],
    discovered: discovered || []
  });
}

/**
 * POST /api/admin/content/monitored-sources
 * Yeni Takip Kaynağı Ekleme ve İşleme (Manuel Instagram post, Web veya RSS/Atom)
 */
export async function POST(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      source_url,
      species_scope = 'both',
      processing_mode = 'admin_review',
      is_manual_process = true
    } = body;

    if (!source_url || typeof source_url !== 'string' || !source_url.trim()) {
      return NextResponse.json({ error: 'Kaynak URL adresi zorunludur.' }, { status: 400 });
    }

    const cleanUrl = source_url.trim();
    const supabase = await createServerSupabaseClient();

    // 1. URL Türünü Tespiti (Instagram Post vs Web/RSS)
    let sourceType: 'instagram_post' | 'web_page' | 'rss' | 'atom' | 'instagram_account' = 'web_page';
    let sourceName = 'Web Kaynağı';
    let sourceHandle: string | null = null;
    let monitoringMode: 'manual' | 'rss' | 'api' | 'unsupported_api' = 'manual';

    if (cleanUrl.includes('instagram.com')) {
      const igParse = parseInstagramUrl(cleanUrl);

      // Profil URL'si tespiti -> unsupported_api uyarısı!
      if (igParse.isProfileUrl || igParse.error?.includes('otomatik takip edilemiyor')) {
        return NextResponse.json(
          {
            error: 'Bu hesap şu anda resmî Instagram API ile otomatik takip edilemiyor. Lütfen ilgili gönderi veya Reel bağlantısını ekleyin.',
            code: 'unsupported_api'
          },
          { status: 400 }
        );
      }

      if (!igParse.isValid) {
        return NextResponse.json({ error: igParse.error || 'Geçersiz Instagram adresi.' }, { status: 400 });
      }

      sourceType = 'instagram_post';
      sourceName = `Instagram Gönderisi (${igParse.shortcode})`;
      monitoringMode = 'manual';
    } else if (cleanUrl.endsWith('.xml') || cleanUrl.includes('/feed') || cleanUrl.includes('/rss') || cleanUrl.includes('atom.xml')) {
      sourceType = cleanUrl.includes('atom') ? 'atom' : 'rss';
      monitoringMode = 'rss';
      try { sourceName = new URL(cleanUrl).hostname + ' RSS Feed'; } catch {}
    } else {
      const webVal = validateWebUrl(cleanUrl);
      if (!webVal.isValid) {
        return NextResponse.json({ error: webVal.error }, { status: 400 });
      }
      sourceType = 'web_page';
      monitoringMode = 'manual';
      try { sourceName = new URL(cleanUrl).hostname; } catch {}
    }

    // 2. Mükerrer Kaynak Kontrolü
    const { data: existingSource } = await supabase
      .from('monitored_sources')
      .select('id')
      .eq('source_url', cleanUrl)
      .maybeSingle();

    let sourceId = existingSource?.id;

    if (!sourceId) {
      const { data: newSource, error: insertErr } = await supabase
        .from('monitored_sources')
        .insert({
          source_type: sourceType,
          source_name: sourceName,
          source_handle: sourceHandle,
          source_url: cleanUrl,
          species_scope: species_scope || 'both',
          monitoring_mode: monitoringMode,
          processing_mode: ['admin_review', 'draft_only'].includes(processing_mode) ? processing_mode : 'admin_review',
          created_by: actor.id,
          last_checked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertErr || !newSource) {
        return NextResponse.json({ error: `Kaynak kaydedilemedi: ${insertErr?.message}` }, { status: 400 });
      }
      sourceId = newSource.id;
    }

    // 3. İçerik Keşfi ve İşleme
    let discoveredItem: any = null;
    let extId = '';
    let permalink = cleanUrl;
    let title = '';
    let summary = '';

    if (sourceType === 'instagram_post') {
      const igOembed = await fetchInstagramOembedInfo(cleanUrl);
      const shortcode = parseInstagramUrl(cleanUrl).shortcode!;
      extId = `ig_${shortcode}`;
      permalink = igOembed.permalink || cleanUrl;
      title = igOembed.title || `Instagram Paylaşımı (${shortcode})`;
      summary = igOembed.authorName ? `@${igOembed.authorName} Instagram gönderisi` : 'Instagram gönderisi';
      sourceHandle = igOembed.authorName || null;

      // Handle güncelle
      if (sourceHandle) {
        await supabase.from('monitored_sources').update({ source_handle: sourceHandle }).eq('id', sourceId);
      }
    } else if (sourceType === 'rss' || sourceType === 'atom') {
      const feedRes = await fetchFeedContent(cleanUrl);
      if (feedRes.error || feedRes.items.length === 0) {
        return NextResponse.json({ error: feedRes.error || 'RSS akışında içerik bulunamadı.' }, { status: 400 });
      }
      const topItem = feedRes.items[0];
      extId = topItem.guid || topItem.contentHash;
      permalink = topItem.link;
      title = topItem.title;
      summary = topItem.summary || '';
    } else {
      const pageRes = await fetchWebPageInfo(cleanUrl);
      if (pageRes.error || !pageRes.item) {
        return NextResponse.json({ error: pageRes.error || 'Web sayfası verisi çekilemedi.' }, { status: 400 });
      }
      extId = pageRes.item.contentHash;
      permalink = pageRes.item.canonicalUrl;
      title = pageRes.item.title;
      summary = pageRes.item.summary || '';
    }

    const contentHash = generateContentHash(title, permalink);

    // 4. Mükerrer İçerik ve Aktif İş Kontrolü (idempotency)
    const { data: existingContent } = await supabase
      .from('discovered_external_contents')
      .select('*')
      .or(`permalink.eq.${permalink},content_hash.eq.${contentHash}`)
      .maybeSingle();

    if (existingContent && existingContent.job_id) {
      // Aktif iş varsa ve silinmemişse ikinci iş oluşturma, mevcut işin boru hattını çalıştır
      const { data: activeJob } = await supabase
        .from('content_generation_jobs')
        .select('*')
        .eq('id', existingContent.job_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (activeJob) {
        const { processJobPipeline } = await import('@/lib/content/jobPipelineService');
        const pipelineRes = await processJobPipeline(supabase, activeJob.id, actor.id);

        return NextResponse.json({
          message: 'Bu içerik için halihazırda aktif bir iş bulundu ve boru hattı çalıştırıldı.',
          source_id: sourceId,
          discovered: existingContent,
          result: pipelineRes
        });
      }
    }

    // 5. Uygunluk Sınıflandırılması
    const classification = classifyDiscoveredContent(title, summary, sourceType);

    if (!classification.isEligible) {
      const { data: rejDisc } = await supabase
        .from('discovered_external_contents')
        .upsert({
          source_id: sourceId,
          external_content_id: extId,
          permalink,
          canonical_url: permalink,
          content_hash: contentHash,
          title,
          excerpt: summary,
          processing_status: 'rejected',
          rejection_reason: classification.rejectionReason
        })
        .select()
        .single();

      return NextResponse.json({
        message: `İçerik Odi yayın ilkelerine uygun bulunmadı: ${classification.rejectionReason}`,
        discovered: rejDisc
      }, { status: 200 });
    }

    // 6. Keşfedilen İçeriği Kaydet
    const { data: newDisc, error: discInsertErr } = await supabase
      .from('discovered_external_contents')
      .upsert({
        source_id: sourceId,
        external_content_id: extId,
        permalink,
        canonical_url: permalink,
        content_hash: contentHash,
        title,
        excerpt: summary,
        processing_status: 'researching',
        published_at: new Date().toISOString()
      })
      .select()
      .single();

    if (discInsertErr) {
      return NextResponse.json({ error: `Keşif kaydı atılamadı: ${discInsertErr.message}` }, { status: 400 });
    }

    // 7. Özgün Türkçe Taslak Üretimi (Job Status -> admin_review_required / researching)
    const draftRes = await generateDraftFromMonitoredSource(
      supabase,
      {
        sourceId,
        externalContentId: extId,
        title,
        permalink,
        publisher: sourceName,
        sourceType,
        category: classification.category,
        speciesScope: species_scope === 'both' ? classification.speciesScope : (species_scope as any),
        isMedicalContent: classification.isMedicalContent,
        rawCaption: summary,
        authorHandle: sourceHandle || undefined
      },
      actor.id
    );

    // 8. Boru Hattını Uçtan Uca Çalıştır
    const { processJobPipeline } = await import('@/lib/content/jobPipelineService');
    const pipelineRes = await processJobPipeline(supabase, draftRes.jobId, actor.id, {
      category: classification.category,
      speciesScope: species_scope === 'both' ? classification.speciesScope : (species_scope as any),
      isMedicalContent: classification.isMedicalContent
    });

    // Güncelleme tarihi koy
    await supabase.from('monitored_sources').update({
      last_checked_at: new Date().toISOString(),
      last_success_at: pipelineRes.success ? new Date().toISOString() : null,
      last_error: pipelineRes.success ? null : pipelineRes.message
    }).eq('id', sourceId);

    return NextResponse.json({
      message: pipelineRes.message,
      source_id: sourceId,
      discovered: newDisc,
      result: pipelineRes
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sunucu hatası.' }, { status: 500 });
  }
}
