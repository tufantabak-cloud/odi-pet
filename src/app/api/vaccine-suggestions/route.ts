import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile';

const suggestionCreateSchema = z.object({
  species: z.enum(['cat', 'dog']),
  name_suggested: z.string().min(2).max(120),
  reason: z.string().max(500).nullable().optional(),
}).strict();

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// POST — Kullanıcı yeni aşı önerisinde bulunur
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

    // Duplicate kontrolü 1: aktif katalogda (vaccine_brands) aynı isimli aşı/marka var mı?
    const { data: brands } = await adminClient
      .from('vaccine_brands')
      .select('id, brand_name, vaccine_name')
      .eq('is_active', true);

    const dupBrand = (brands || []).find(b => 
      normalizeName(b.brand_name || '') === nameNorm || normalizeName(b.vaccine_name || '') === nameNorm
    );
    if (dupBrand) {
      return NextResponse.json(
        { error: 'DUPLICATE_PRODUCT', existing_product: { id: dupBrand.id, name: dupBrand.vaccine_name || dupBrand.brand_name } },
        { status: 409 }
      );
    }

    // Duplicate kontrolü 2: aynı isimle bekleyen öneri var mı?
    const { data: pending } = await adminClient
      .from('vaccine_catalog_suggestions')
      .select('id, name_suggested')
      .eq('status', 'pending')
      .eq('species', data.species);

    const dupSuggestion = (pending || []).find(s => normalizeName(s.name_suggested) === nameNorm);
    if (dupSuggestion) {
      return NextResponse.json({ error: 'DUPLICATE_SUGGESTION' }, { status: 409 });
    }

    const { data: suggestion, error: insertError } = await adminClient
      .from('vaccine_catalog_suggestions')
      .insert({
        suggested_by: user.id,
        species: data.species,
        name_suggested: data.name_suggested.trim(),
        reason: data.reason?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !suggestion) {
      return NextResponse.json({ error: 'SUGGESTION_CREATE_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ suggestion, data: suggestion }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'SUGGESTION_CREATE_FAILED' }, { status: 500 });
  }
}

// GET — Geriye dönük uyumluluk (Admin öneri listeleme)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actor = await requireRole(['admin', 'founder']);
    if (!actor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('vaccine_catalog_suggestions')
      .select('*, profiles!vaccine_catalog_suggestions_suggested_by_fkey(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
