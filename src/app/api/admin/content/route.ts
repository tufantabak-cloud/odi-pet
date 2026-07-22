import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content
 * İçerikleri filtreleyerek listeler.
 */
export async function GET(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const category = searchParams.get('category');
  const species = searchParams.get('species'); // 'cat' | 'dog' | 'both'
  const status = searchParams.get('status'); // 'published' | 'draft' | 'archived'
  const isMedical = searchParams.get('is_medical'); // 'true' | 'false'
  const vetStatus = searchParams.get('vet_status'); // 'not_required' | 'pending' | 'approved'
  const freshnessFilter = searchParams.get('freshness'); // 'expired' | 'due_soon' | 'fresh' | 'needs_review'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('articles')
    .select('*', { count: 'exact' })
    .order('priority_order', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,excerpt.ilike.%${q}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (species) {
    query = query.contains('species_filter', [species]);
  }
  if (status === 'published') {
    query = query.eq('is_published', true).is('archived_at', null);
  } else if (status === 'draft') {
    query = query.eq('is_published', false).is('archived_at', null);
  } else if (status === 'archived') {
    query = query.not('archived_at', 'is', null);
  }
  if (isMedical === 'true') {
    query = query.eq('is_medical_content', true);
  } else if (isMedical === 'false') {
    query = query.eq('is_medical_content', false);
  }
  if (vetStatus) {
    query = query.eq('vet_review_status', vetStatus);
  }

  // Güncellik Filtreleri
  const nowIso = new Date().toISOString();
  const in30DaysIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  if (freshnessFilter === 'expired') {
    query = query.lt('next_review_at', nowIso).is('archived_at', null);
  } else if (freshnessFilter === 'due_soon') {
    query = query.gte('next_review_at', nowIso).lte('next_review_at', in30DaysIso).is('archived_at', null);
  } else if (freshnessFilter === 'fresh') {
    query = query.gt('next_review_at', nowIso).is('archived_at', null);
  } else if (freshnessFilter === 'needs_review') {
    query = query.lte('next_review_at', in30DaysIso).is('archived_at', null);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    articles: data || [],
    data: data || [],
    totalCount: count ?? 0,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize)
    }
  });
}

/**
 * POST /api/admin/content
 * Yeni içerik ekler.
 */
export async function POST(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      title,
      slug,
      excerpt,
      content,
      cover_url,
      category,
      read_time_minutes,
      species_filter,
      target_breed_keys,
      target_breed_traits,
      target_life_stages,
      target_genders,
      target_neutered_status,
      target_seasons,
      start_date,
      end_date,
      priority_order,
      is_medical_content,
      vet_review_status,
      references_list,
      is_published,
      freshness_type,
      review_interval_days
    } = body;

    // 1. Zorunlu Alan Kontrolü
    if (!title || !slug || !excerpt || !content) {
      return NextResponse.json(
        { error: 'Başlık, slug, özet ve içerik alanları zorunludur.' },
        { status: 400 }
      );
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-');
    const supabase = await createServerSupabaseClient();

    // 2. Slug Benzersizlik Kontrolü
    const { data: existingSlug } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Bu slug adresi başka bir içerik tarafından kullanılıyor.' },
        { status: 400 }
      );
    }

    // 3. Tarih Aralığı Kontrolü
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: 'Başlangıç tarihi bitiş tarihinden sonra olamaz.' },
        { status: 400 }
      );
    }

    const isMedical = Boolean(is_medical_content);
    const isPub = Boolean(is_published);
    let vetStatus = vet_review_status || (isMedical ? 'pending' : 'not_required');

    // 4. Güncellik Tarih Hesaplamaları
    const fType = freshness_type || (isMedical ? 'medical' : 'evergreen');
    let intervalDays = Number(review_interval_days);
    if (!intervalDays || isNaN(intervalDays)) {
      intervalDays = fType === 'medical' || fType === 'seasonal' ? 180 : fType === 'product_regulatory' ? 90 : 365;
    }

    const nowIso = new Date().toISOString();
    const reviewedAt = body.content_reviewed_at || nowIso;
    const nextReviewIso = body.next_review_at || new Date(new Date(reviewedAt).getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

    // 5. Yayın Güvenliği Kuralları (Eğer is_published = true yapılacaksa)
    if (isPub) {
      // a. Tür Seçimi Zorunlu
      if (!species_filter || !Array.isArray(species_filter) || species_filter.length === 0) {
        return NextResponse.json(
          { error: 'Tür seçimi (species_filter) yapılmadan içerik yayınlanamaz.' },
          { status: 400 }
        );
      }

      // b. Güncellik Kontrol Tarihi Geçmiş Olamaz
      if (new Date(nextReviewIso) < new Date()) {
        return NextResponse.json(
          { error: 'Kontrol tarihi geçmiş olan içerikler yayınlanamaz.' },
          { status: 400 }
        );
      }

      // c. Tıbbi İçerik Onay ve Kaynak Koşulu
      if (isMedical) {
        if (vetStatus !== 'approved') {
          return NextResponse.json(
            { error: 'Veteriner onayı (approved) olmadan tıbbi içerikler yayınlanamaz.' },
            { status: 400 }
          );
        }
        if (!references_list || !Array.isArray(references_list) || references_list.length === 0) {
          return NextResponse.json(
            { error: 'Tıbbi içerikler için en az bir kaynak eklenmelidir.' },
            { status: 400 }
          );
        }
      }

      // d. Ürün & Mevzuat (product_regulatory) Resmi Kaynak Koşulu
      if (fType === 'product_regulatory') {
        const hasOfficialOrManufacturer = Array.isArray(body.sources) && body.sources.some(
          (s: any) => s.source_type === 'official' || s.source_type === 'manufacturer'
        );
        if (!hasOfficialOrManufacturer) {
          return NextResponse.json(
            { error: 'Ürün ve mevzuat içerikleri (product_regulatory) için resmi (official) veya üretici (manufacturer) kaynağı eklenmesi zorunludur.' },
            { status: 400 }
          );
        }
      }
    }

    // Vet onay verileri — YALNIZCA SUNUCU TARAFINDAN ATANIR
    let vetReviewedBy = null;
    let vetReviewedAt = null;
    if (vetStatus === 'approved') {
      vetReviewedBy = actor.id;
      vetReviewedAt = new Date().toISOString();
    }

    const { data: newArticle, error: insertError } = await supabase
      .from('articles')
      .insert({
        title: title.trim(),
        slug: cleanSlug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        cover_url: cover_url?.trim() || null,
        category: category || 'genel',
        read_time_minutes: read_time_minutes ? Number(read_time_minutes) : 3,
        species_filter: Array.isArray(species_filter) ? species_filter : [],
        target_breed_keys: Array.isArray(target_breed_keys) ? target_breed_keys : [],
        target_breed_traits: Array.isArray(target_breed_traits) ? target_breed_traits : [],
        target_life_stages: Array.isArray(target_life_stages) ? target_life_stages : [],
        target_genders: Array.isArray(target_genders) ? target_genders : [],
        target_neutered_status: target_neutered_status || 'all',
        target_seasons: Array.isArray(target_seasons) ? target_seasons : [],
        start_date: start_date || null,
        end_date: end_date || null,
        priority_order: priority_order !== undefined ? Number(priority_order) : 0,
        is_medical_content: isMedical,
        vet_review_status: vetStatus,
        vet_reviewed_by: vetReviewedBy,
        vet_reviewed_at: vetReviewedAt,
        references_list: Array.isArray(references_list) ? references_list : [],
        is_published: isPub,
        published_at: isPub ? new Date().toISOString() : null,
        author: actor.full_name || 'Admin',
        author_id: actor.id,
        // Güncellik alanları
        freshness_type: fType,
        review_interval_days: intervalDays,
        content_reviewed_at: reviewedAt,
        content_reviewed_by: actor.id,
        source_checked_at: body.source_checked_at || nowIso,
        next_review_at: nextReviewIso,
        content_version: 1,
        latest_change_summary: body.latest_change_summary || 'İlk oluşturulma',
        archived_at: null
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json(newArticle, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Geçersiz istek.' }, { status: 400 });
  }
}
