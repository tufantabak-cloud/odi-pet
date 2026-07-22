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
    if (body.is_published !== undefined) updates.is_published = Boolean(body.is_published);

    // İstemciden gönderilen otoriter denetim parametrelerini ezilmeyi önlemek için sil
    delete updates.author;
    delete updates.author_id;
    delete updates.vet_reviewed_by;
    delete updates.vet_reviewed_at;
    delete updates.published_at;

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

    // Birleşik nihai durumlar
    const finalIsMedical = updates.is_medical_content !== undefined ? updates.is_medical_content : existing.is_medical_content;
    const finalIsPublished = updates.is_published !== undefined ? updates.is_published : existing.is_published;
    const finalSpeciesFilter = updates.species_filter !== undefined ? updates.species_filter : existing.species_filter;
    const finalVetStatus = updates.vet_review_status !== undefined ? updates.vet_review_status : existing.vet_review_status;

    // Yayın Güvenliği Kuralları
    if (finalIsPublished) {
      // Tür seçimi zorunluluğu
      if (!finalSpeciesFilter || !Array.isArray(finalSpeciesFilter) || finalSpeciesFilter.length === 0) {
        return NextResponse.json(
          { error: 'Tür seçimi yapılmadan içerik yayınlanamaz.' },
          { status: 400 }
        );
      }

      // Tıbbi içerik onay zorunluluğu
      if (finalIsMedical && finalVetStatus !== 'approved') {
        return NextResponse.json(
          { error: 'Veteriner onayı (approved) olmadan tıbbi içerikler yayınlanamaz.' },
          { status: 400 }
        );
      }
    }

    // Vet onay verileri güncelleme — YALNIZCA SUNUCU TARAFINDAN YÖNETİLİR
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
