import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { validateArticlePublishability } from '@/lib/content/contentPublishGuard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !article) {
    return NextResponse.json({ error: 'İçerik bulunamadı.' }, { status: 404 });
  }

  return NextResponse.json(article);
}

/**
 * PATCH /api/admin/content/[id]
 * Desteklenen Aksiyonlar (body.action):
 * - change_vet_review_requirement: RPC change_vet_review_requirement çağırır, kalıcı audit kaydı oluşturur.
 * - save_article_draft: İçerik / taslak güncellemesi yapar (sürüm revizyon snapshot alır).
 * - request_vet_review: vet_review_status = 'pending' yapar.
 * - publish_article: Yayın bariyerlerini sunucu tarafında doğrular, is_published = true, published_by = actor.id yapar.
 * - unpublish_article: is_published = false yapar.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim. Yalnız admin ve founder düzenleme yapabilir.' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Mevcut makaleyi çek
  const { data: existing, error: findError } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !existing) {
    return NextResponse.json({ error: 'Düzenlenecek içerik bulunamadı.' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const action = body.action || (body.is_published === true ? 'publish_article' : body.is_published === false ? 'unpublish_article' : 'save_article_draft');

    // 1. KESİN GÜVENLİK: İstemciden gelen hassas aktör ve zaman alanlarını temizle
    delete body.published_by;
    delete body.published_at;
    delete body.vet_review_override_by;
    delete body.vet_review_override_at;

    // A. AKSİYON: change_vet_review_requirement
    if (action === 'change_vet_review_requirement') {
      const newRequirement = body.vet_review_requirement;
      const reason = body.vet_review_override_reason || body.reason;

      if (!newRequirement || !['required', 'optional', 'not_required'].includes(newRequirement)) {
        return NextResponse.json(
          { error: 'Geçersiz veteriner inceleme gereksinimi. (required, optional, not_required olmalıdır)' },
          { status: 400 }
        );
      }

      // Tıbbi içeriklerde required -> optional / not_required geçişinde gerekçe zorunluluğu
      if (existing.is_medical_content && existing.vet_review_requirement === 'required' && ['optional', 'not_required'].includes(newRequirement)) {
        if (!reason || !reason.trim()) {
          return NextResponse.json(
            { error: 'Tıbbi içeriklerde veteriner onay zorunluluğunu değiştirmek için gerekçe belirtilmesi zorunludur.' },
            { status: 400 }
          );
        }
      }

      // Sahte klinik onay ifade engeli (sunucu tarafı ek güvence)
      const hasRealVetApproval = existing.vet_review_status === 'approved' && existing.vet_reviewed_by;
      if (!hasRealVetApproval && reason) {
        const cleanReason = reason.trim();
        const fakeClaimPatterns = [
          /klinik.*(denetim|inceleme|kontrol).*(tamamland|yapıld)/i,
          /veteriner.*(tarafından\s+)?onayland/i,
          /hekim.*(kontrol|inceleme|denetim).*ge.ti/i,
          /veteriner\s+hekim\s+incelemes/i
        ];
        const hasFakeClaim = fakeClaimPatterns.some(p => p.test(cleanReason));
        if (hasFakeClaim) {
          return NextResponse.json(
            { error: 'Bu ifade gerçek bir veteriner incelemesi yapıldığını ima ediyor ancak bu makale için onaylanmış veteriner kaydı bulunmuyor. Lütfen gerekçeyi düzeltin.' },
            { status: 400 }
          );
        }
      }

      // Atomik RPC Çağrısı (Audit kaydı aynı transaction içinde oluşur)
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('change_vet_review_requirement', {
        p_article_id: id,
        p_new_requirement: newRequirement,
        p_reason: reason ? reason.trim() : 'Gereksinim güncellendi'
      });

      if (rpcErr) {
        return NextResponse.json({ error: rpcErr.message }, { status: 400 });
      }

      // Gereksinim değiştirmek otomatik yayınlama YAPMAZ
      return NextResponse.json(rpcRes);
    }

    // B. AKSİYON: request_vet_review
    if (action === 'request_vet_review') {
      const { data: updated, error: updateErr } = await supabase
        .from('articles')
        .update({ vet_review_status: 'pending' })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return NextResponse.json(updated);
    }

    // C. AKSİYON: unpublish_article
    if (action === 'unpublish_article') {
      const { data: updated, error: updateErr } = await supabase
        .from('articles')
        .update({ is_published: false })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return NextResponse.json(updated);
    }

    // D. AKSİYON: publish_article
    if (action === 'publish_article') {
      // 1. Temel Zorunlu Alan Kontrolü
      const finalTitle = (body.title || existing.title || '').trim();
      const finalSlug = (body.slug || existing.slug || '').trim();
      const finalExcerpt = (body.excerpt || existing.excerpt || '').trim();
      const finalContent = (body.content || existing.content || '').trim();

      if (!finalTitle || !finalSlug || !finalExcerpt || !finalContent) {
        return NextResponse.json(
          { error: 'Yayınlama için başlık, slug, kısa özet ve içerik alanlarının tamamı dolu olmalıdır.' },
          { status: 400 }
        );
      }

      // 2. Kaynaklar ve Görselleri Çekerek Yayın Bariyerlerini Kontrol Et
      const [{ data: sources }, { data: media }] = await Promise.all([
        supabase.from('article_sources').select('*').eq('article_id', id),
        supabase.from('article_media').select('*').eq('article_id', id)
      ]);

      const reqPolicy = existing.vet_review_requirement || (existing.is_medical_content ? 'required' : 'not_required');
      const guardResult = validateArticlePublishability({
        article: {
          ...existing,
          title: finalTitle,
          slug: finalSlug,
          excerpt: finalExcerpt,
          content: finalContent,
          is_published: true,
          vet_review_requirement: reqPolicy
        },
        sources: sources || [],
        media: media || []
      });

      if (!guardResult.canPublish) {
        return NextResponse.json({
          error: `Makale yayınlama engellendi: ${guardResult.blockers.join(' ')}`,
          blockers: guardResult.blockers
        }, { status: 400 });
      }

      // 3. vet_review_requirement Kuralları
      if (reqPolicy === 'required' && existing.is_medical_content && existing.vet_review_status !== 'approved') {
        return NextResponse.json(
          { error: 'Veteriner onayı (approved) olmadan bu içerik yayınlanamaz.' },
          { status: 400 }
        );
      }

      const finalVetStatus = reqPolicy === 'not_required' ? 'not_required' : existing.vet_review_status;

      // 4. Sunucu Tarafı İmzalı Yayınlama Güncellemesi
      const nowIso = new Date().toISOString();
      const { data: publishedArticle, error: pubErr } = await supabase
        .from('articles')
        .update({
          is_published: true,
          published_at: nowIso,
          published_by: actor.id,
          vet_review_status: finalVetStatus
        })
        .eq('id', id)
        .select()
        .single();

      if (pubErr) throw pubErr;
      return NextResponse.json(publishedArticle);
    }

    // E. AKSİYON: save_article_draft
    const updates: Record<string, any> = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt.trim();
    if (body.content !== undefined) updates.content = body.content.trim();
    if (body.cover_url !== undefined) updates.cover_url = body.cover_url ? body.cover_url.trim() : null;
    if (body.category !== undefined) updates.category = body.category;
    if (body.read_time_minutes !== undefined) updates.read_time_minutes = Number(body.read_time_minutes);
    if (body.species_filter !== undefined) updates.species_filter = body.species_filter;
    if (body.target_breed_keys !== undefined) updates.target_breed_keys = body.target_breed_keys;
    if (body.target_breed_traits !== undefined) updates.target_breed_traits = body.target_breed_traits;
    if (body.target_life_stages !== undefined) updates.target_life_stages = body.target_life_stages;
    if (body.target_genders !== undefined) updates.target_genders = body.target_genders;
    if (body.target_neutered_status !== undefined) updates.target_neutered_status = body.target_neutered_status;
    if (body.target_seasons !== undefined) updates.target_seasons = body.target_seasons;
    if (body.start_date !== undefined) updates.start_date = body.start_date || null;
    if (body.end_date !== undefined) updates.end_date = body.end_date || null;
    if (body.priority_order !== undefined) updates.priority_order = Number(body.priority_order);
    if (body.is_medical_content !== undefined) updates.is_medical_content = Boolean(body.is_medical_content);
    if (body.references_list !== undefined) updates.references_list = body.references_list;
    if (body.freshness_type !== undefined) updates.freshness_type = body.freshness_type;
    if (body.review_interval_days !== undefined) updates.review_interval_days = Number(body.review_interval_days);

    // Slug kontrolü
    if (body.slug && body.slug !== existing.slug) {
      const cleanSlug = body.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-');
      const { data: slugCheck } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', cleanSlug)
        .neq('id', id)
        .maybeSingle();

      if (slugCheck) {
        return NextResponse.json(
          { error: 'Bu slug başka bir makale tarafından kullanılıyor.' },
          { status: 400 }
        );
      }
      updates.slug = cleanSlug;
    }

    // Atomik RPC Stored Procedure Çağrısı ile Taslak Kaydı
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_article_with_revision', {
      p_article_id: id,
      p_updates: updates,
      p_change_summary: body.latest_change_summary?.trim() || 'İçerik taslağı kaydedildi.',
      p_actor_id: actor.id
    });

    if (!rpcErr && rpcRes) {
      return NextResponse.json(rpcRes);
    }

    // Fallback
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json(updatedArticle);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Geçersiz güncelleme isteği.' }, { status: 400 });
  }
}
