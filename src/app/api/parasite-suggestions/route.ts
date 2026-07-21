import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';

// Kullanıcı ürün önerisi — kayıt akışından BAĞIMSIZ, best-effort yan işlem.
// suggested_by/status sunucudan yazılır; istemci admin alanlarını gönderemez
// (strict şema). Asıl güvenlik: service-role + bu şema; RLS savunma katmanıdır.

const suggestionCreateSchema = z.object({
  species: z.enum(['cat', 'dog']),
  name_suggested: z.string().min(2).max(120),
  brand: z.string().max(120).nullable().optional(),
  parasite_type: z.enum(['internal', 'external', 'combined', 'collar']),
  application_method: z.enum(['spot_on', 'oral', 'collar', 'injection', 'spray', 'shampoo', 'other']),
  protection_duration_days: z.number().int().positive().max(1095),
  reason: z.string().max(500).nullable().optional(),
}).strict();

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'INVALID_SUGGESTION_DATA' }, { status: 400 });
    }

    const parseResult = suggestionCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'INVALID_SUGGESTION_DATA' }, { status: 400 });
    }
    const data = parseResult.data;

    const adminClient = createAdminSupabaseClient();
    const nameNorm = normalizeName(data.name_suggested);

    // Duplicate kontrolü 1: aktif katalogda aynı isimli ürün var mı?
    const { data: products } = await adminClient
      .from('parasite_products')
      .select('id, name, brand')
      .eq('is_active', true)
      .in('species', [data.species, 'both']);

    const dupProduct = (products || []).find(p => normalizeName(p.name) === nameNorm);
    if (dupProduct) {
      return NextResponse.json(
        { error: 'DUPLICATE_PRODUCT', existing_product: { id: dupProduct.id, name: dupProduct.name, brand: dupProduct.brand } },
        { status: 409 }
      );
    }

    // Duplicate kontrolü 2: aynı isimle bekleyen öneri var mı?
    const { data: pending } = await adminClient
      .from('parasite_product_suggestions')
      .select('id, name_suggested')
      .eq('status', 'pending')
      .eq('species', data.species);

    const dupSuggestion = (pending || []).find(s => normalizeName(s.name_suggested) === nameNorm);
    if (dupSuggestion) {
      return NextResponse.json({ error: 'DUPLICATE_SUGGESTION' }, { status: 409 });
    }

    const { data: suggestion, error: insertError } = await adminClient
      .from('parasite_product_suggestions')
      .insert({
        suggested_by: user.id,
        species: data.species,
        name_suggested: data.name_suggested.trim(),
        brand: data.brand?.trim() || null,
        parasite_type: data.parasite_type,
        application_method: data.application_method,
        protection_duration_days: data.protection_duration_days,
        reason: data.reason?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !suggestion) {
      return NextResponse.json({ error: 'SUGGESTION_CREATE_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ suggestion }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'SUGGESTION_CREATE_FAILED' }, { status: 500 });
  }
}
