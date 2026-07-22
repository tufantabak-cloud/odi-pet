import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';

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
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
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
    const updates: Record<string, any> = {};

    // Gelen alanları güncelleme nesnesine aktar
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
    if (body.vet_review_status !== undefined) updates.vet_review_status = body.vet_review_status;
    if (body.references_list !== undefined) updates.references_list = body.references_list;
    if (body.is_published !== undefined) {
      const willPublish = Boolean(body.is_published);
      if (willPublish) {
        // Kaynakları ve görselleri çekerek yayın bariyerlerini kontrol et
        const [{ data: sources }, { data: media }] = await Promise.all([
          supabase.from('article_sources').select('*').eq('article_id', id),
          supabase.from('article_media').select('*').eq('article_id', id)
        ]);

        const { validateArticlePublishability } = await import('@/lib/content/contentPublishGuard');
        const guardResult = validateArticlePublishability({
          article: { ...existing, ...updates, is_published: true },
          sources: sources || [],
          media: media || []
        });

        if (!guardResult.canPublish) {
          return NextResponse.json({
            error: `Makale yayınlama engellendi: ${guardResult.blockers.join(' ')}`,
            blockers: guardResult.blockers
          }, { status: 400 });
        }
      }
      updates.is_published = willPublish;
    }
    if (body.freshness_type !== undefined) updates.freshness_type = body.freshness_type;
    if (body.review_interval_days !== undefined) updates.review_interval_days = Number(body.review_interval_days);

    // Arşivleme Durumu
    if (body.is_archived === true) {
      updates.archived_at = new Date().toISOString();
      updates.is_published = false;
    } else if (body.is_archived === false) {
      updates.archived_at = null;
    }

    // İstemci manipülasyon koruması
    delete updates.author;
    delete updates.author_id;
    delete updates.vet_reviewed_by;
    delete updates.vet_reviewed_at;
    delete updates.published_at;
    delete updates.content_version;

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

    // Tarih aralığı kontrolü
    const finalStartDate = updates.start_date !== undefined ? updates.start_date : existing.start_date;
    const finalEndDate = updates.end_date !== undefined ? updates.end_date : existing.end_date;
    if (finalStartDate && finalEndDate && new Date(finalStartDate) > new Date(finalEndDate)) {
      return NextResponse.json(
        { error: 'Başlangıç tarihi bitiş tarihinden sonra olamaz.' },
        { status: 400 }
      );
    }

    // Gerçek İçerik / Hedefleme Değişikliği Tespiti
    const isContentOrTargetingChanged =
      (updates.title !== undefined && updates.title !== existing.title) ||
      (updates.excerpt !== undefined && updates.excerpt !== existing.excerpt) ||
      (updates.content !== undefined && updates.content !== existing.content) ||
      (updates.species_filter !== undefined && JSON.stringify(updates.species_filter) !== JSON.stringify(existing.species_filter)) ||
      (updates.target_breed_keys !== undefined && JSON.stringify(updates.target_breed_keys) !== JSON.stringify(existing.target_breed_keys)) ||
      (updates.target_breed_traits !== undefined && JSON.stringify(updates.target_breed_traits) !== JSON.stringify(existing.target_breed_traits)) ||
      (updates.target_life_stages !== undefined && JSON.stringify(updates.target_life_stages) !== JSON.stringify(existing.target_life_stages));

    // A. Seçenek B: İçerik / Hedefleme Değişti (Version Bump & Snapshot - Atomik RPC)
    if (isContentOrTargetingChanged) {
      if (!body.latest_change_summary || !body.latest_change_summary.trim()) {
        return NextResponse.json(
          { error: 'İçerik veya hedefleme değişikliklerinde sürüm açıklaması (latest_change_summary) zorunludur.' },
          { status: 400 }
        );
      }

      // Atomik RPC Stored Procedure Çağrısı
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_article_with_revision', {
        p_article_id: id,
        p_updates: updates,
        p_change_summary: body.latest_change_summary.trim(),
        p_actor_id: actor.id
      });

      if (!rpcErr && rpcRes) {
        return NextResponse.json(rpcRes);
      }

      // Fallback: RPC erişilemezse standart güncellemeyi yap
      await supabase.from('article_revisions').insert({
        article_id: id,
        version_number: existing.content_version || 1,
        content_snapshot: existing,
        change_summary: body.latest_change_summary.trim(),
        changed_by: actor.id,
        changed_at: new Date().toISOString()
      });

      updates.content_version = (existing.content_version || 1) + 1;
      updates.latest_change_summary = body.latest_change_summary.trim();
      updates.content_reviewed_at = new Date().toISOString();
      updates.content_reviewed_by = actor.id;
      updates.source_checked_at = new Date().toISOString();
    }
    // B. Seçenek A: Sadece Yeniden Doğrulama (Reverify - No Version Bump)
    else if (body.action === 'reverify') {
      updates.content_reviewed_at = new Date().toISOString();
      updates.content_reviewed_by = actor.id;
      updates.source_checked_at = new Date().toISOString();
    }

    // Sonraki Kontrol Tarihi Hesaplama
    const interval = updates.review_interval_days || existing.review_interval_days || 365;
    const refDate = updates.content_reviewed_at || existing.content_reviewed_at || new Date().toISOString();
    updates.next_review_at = new Date(new Date(refDate).getTime() + interval * 24 * 60 * 60 * 1000).toISOString();

    // Birleşik nihai durumlar
    const finalIsMedical = updates.is_medical_content !== undefined ? updates.is_medical_content : existing.is_medical_content;
    const finalIsPublished = updates.is_published !== undefined ? updates.is_published : existing.is_published;
    const finalSpeciesFilter = updates.species_filter !== undefined ? updates.species_filter : existing.species_filter;
    const finalVetStatus = updates.vet_review_status !== undefined ? updates.vet_review_status : existing.vet_review_status;
    const finalNextReview = updates.next_review_at;
    const finalReferences = updates.references_list !== undefined ? updates.references_list : existing.references_list;

    // Yayın Güvenliği Kuralları
    if (finalIsPublished) {
      // Tür seçimi zorunluluğu
      if (!finalSpeciesFilter || !Array.isArray(finalSpeciesFilter) || finalSpeciesFilter.length === 0) {
        return NextResponse.json(
          { error: 'Tür seçimi yapılmadan içerik yayınlanamaz.' },
          { status: 400 }
        );
      }

      // Kontrol tarihi geçmiş içerik yayınlanamaz
      if (new Date(finalNextReview) < new Date()) {
        return NextResponse.json(
          { error: 'Kontrol süresi geçmiş içerikler yayınlanamaz. Lütfen içerik güncelliğini onaylayın.' },
          { status: 400 }
        );
      }

      // Tıbbi içerik onay & kaynak zorunluluğu
      if (finalIsMedical) {
        if (finalVetStatus !== 'approved') {
          return NextResponse.json(
            { error: 'Veteriner onayı (approved) olmadan tıbbi içerikler yayınlanamaz.' },
            { status: 400 }
          );
        }
        if (!finalReferences || !Array.isArray(finalReferences) || finalReferences.length === 0) {
          return NextResponse.json(
            { error: 'Tıbbi içerikler için en az bir kaynak eklenmelidir.' },
            { status: 400 }
          );
        }
      }
    }

    // Vet onay verileri güncelleme
    if (finalVetStatus === 'approved') {
      if (!existing.vet_reviewed_at) {
        updates.vet_reviewed_by = actor.id;
        updates.vet_reviewed_at = new Date().toISOString();
      }
    } else {
      updates.vet_reviewed_by = null;
      updates.vet_reviewed_at = null;
    }

    if (updates.is_published === true && !existing.published_at) {
      updates.published_at = new Date().toISOString();
    }

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
