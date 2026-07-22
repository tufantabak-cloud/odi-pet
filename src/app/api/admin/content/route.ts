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
  const status = searchParams.get('status'); // 'published' | 'draft'
  const isMedical = searchParams.get('is_medical'); // 'true' | 'false'
  const vetStatus = searchParams.get('vet_status'); // 'not_required' | 'pending' | 'approved'
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
    query = query.eq('is_published', true);
  } else if (status === 'draft') {
    query = query.eq('is_published', false);
  }
  if (isMedical === 'true') {
    query = query.eq('is_medical_content', true);
  } else if (isMedical === 'false') {
    query = query.eq('is_medical_content', false);
  }
  if (vetStatus) {
    query = query.eq('vet_review_status', vetStatus);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
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
      is_published
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

    // 4. Yayın Güvenliği Kuralları (Eğer is_published = true yapılacaksa)
    if (isPub) {
      // a. Tür Seçimi Zorunlu
      if (!species_filter || !Array.isArray(species_filter) || species_filter.length === 0) {
        return NextResponse.json(
          { error: 'Tür seçimi (species_filter) yapılmadan içerik yayınlanamaz.' },
          { status: 400 }
        );
      }

      // b. Tıbbi İçerik Onay Koşulu
      if (isMedical && vetStatus !== 'approved') {
        return NextResponse.json(
          { error: 'Veteriner onayı (approved) olmadan tıbbi içerikler yayınlanamaz.' },
          { status: 400 }
        );
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
        author_id: actor.id
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
