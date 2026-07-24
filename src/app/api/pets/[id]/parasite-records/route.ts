import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import { validatePetDocumentPath } from '@/lib/storage/pet-document-path';
import { validateProductForRecord } from '@/features/pets/parasite-product-compat';

function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  if (year < 1900 || year > 2100) return false;
  if (month < 0 || month > 11) return false;
  
  const parsedDate = new Date(year, month, day);
  
  const reconstructed = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
  if (reconstructed !== dateStr) return false;
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr <= todayStr;
}

const parasiteRecordCreateSchema = z.object({
  parasite_protocol_id: z.string().uuid(),
  parasite_product_id: z.string().uuid().nullable().optional(),
  administered_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  application_method: z.string(),
  brand_free_text: z.string().max(255).nullable().optional(),
  product_free_text: z.string().max(255).nullable().optional(),
  protection_duration_days: z.number().int().positive().max(1095).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  document_storage_path: z.string().max(1024).nullable().optional(),
}).strict();

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: petId } = await props.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const adminClient = createAdminSupabaseClient();
    const { data: pet } = await adminClient.from('pets').select('id, species').eq('id', petId).single();
    if (!pet) return NextResponse.json({ error: 'PET_NOT_FOUND' }, { status: 404 });

    const { data: ownership } = await adminClient
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .single();

    if (!ownership) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    if (pet.species !== 'dog' && pet.species !== 'cat') {
      return NextResponse.json({ error: 'INVALID_PET_SPECIES' }, { status: 400 });
    }

    const { data: records, error: recordsError } = await adminClient
      .from('parasite_records')
      .select('*')
      .eq('pet_id', petId)
      .order('administered_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (recordsError || !records) {
      return NextResponse.json({ error: 'PARASITE_RECORD_LIST_FAILED' }, { status: 500 });
    }

    const protocolIds = [...new Set(records.map(r => r.parasite_protocol_id).filter(Boolean))];
    
    let protocols: any[] = [];
    if (protocolIds.length > 0) {
      const { data: protocolsData } = await adminClient
        .from('parasite_protocols')
        .select('id, protocol_name')
        .in('id', protocolIds);
      protocols = protocolsData || [];
    }

    const protocolMap = new Map(protocols.map(p => [p.id, p.protocol_name]));

    const formattedRecords = records.map(record => ({
      ...record,
      protocol_name: record.parasite_protocol_id ? (protocolMap.get(record.parasite_protocol_id) || record.parasite_code) : record.parasite_code
    }));

    return NextResponse.json(formattedRecords);
  } catch (error) {
    return NextResponse.json({ error: 'PARASITE_RECORD_LIST_FAILED' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: petId } = await props.params;
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const adminClient = createAdminSupabaseClient();
    const { data: pet } = await adminClient.from('pets').select('id, species').eq('id', petId).single();
    if (!pet) return NextResponse.json({ error: 'PET_NOT_FOUND' }, { status: 404 });

    const { data: ownership } = await adminClient
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .single();

    if (!ownership) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    if (pet.species !== 'dog' && pet.species !== 'cat') {
      return NextResponse.json({ error: 'INVALID_PET_SPECIES' }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = parasiteRecordCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'INVALID_PARASITE_RECORD_DATA' }, { status: 400 });
    }

    const data = parseResult.data;

    if (!isValidDate(data.administered_at)) {
      return NextResponse.json({ error: 'INVALID_PARASITE_RECORD_DATA' }, { status: 400 });
    }

    const { data: protocol } = await adminClient
      .from('parasite_protocols')
      .select('id, is_active, species, parasite_code, parasite_type, allowed_application_methods, default_protection_duration_days')
      .eq('id', data.parasite_protocol_id)
      .single();

    if (!protocol) return NextResponse.json({ error: 'PROTOCOL_NOT_FOUND' }, { status: 404 });
    if (!protocol.is_active) return NextResponse.json({ error: 'INACTIVE_PROTOCOL' }, { status: 409 });
    if (protocol.species !== pet.species) return NextResponse.json({ error: 'PROTOCOL_SPECIES_MISMATCH' }, { status: 400 });

    const allowedMethods = protocol.allowed_application_methods as string[] || [];
    if (!allowedMethods.includes(data.application_method)) {
      return NextResponse.json({ error: 'INVALID_APPLICATION_METHOD' }, { status: 400 });
    }

    // Katalog ürünü seçildiyse sunucu tarafında doğrula. Enum eşlemesi
    // (spot-on↔spot_on, both, collar) bilinçli olarak app katmanındadır.
    let product: {
      id: string;
      name: string;
      brand: string;
      species: string;
      type: string;
      application_method: string;
      protection_duration_days: number;
      is_active: boolean;
    } | null = null;

    if (data.parasite_product_id) {
      const { data: productData } = await adminClient
        .from('parasite_products')
        .select('id, name, brand, species, type, application_method, protection_duration_days, is_active')
        .eq('id', data.parasite_product_id)
        .single();

      if (!productData) return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 });

      const compatFailure = validateProductForRecord({
        product: productData,
        petSpecies: pet.species,
        protocolParasiteType: protocol.parasite_type,
        protocolAllowedMethods: allowedMethods,
        recordApplicationMethod: data.application_method,
      });
      if (compatFailure) {
        return NextResponse.json(
          { error: compatFailure },
          { status: compatFailure === 'PRODUCT_INACTIVE' ? 409 : 400 }
        );
      }
      product = productData;
    }

    // Süre önceliği: kullanıcının doğruladığı süre → ürünün gerçek süresi →
    // protokol varsayılanı. Nihai değer kayda snapshot olarak yazılır.
    // Not: süre=0 olan ürünler TEDAVİ ürünüdür (kalıcı koruma yok) — bu
    // durumda süre protokol varsayılanından gelir (kayıt CHECK'i > 0 ister).
    const productDuration =
      product && product.protection_duration_days > 0 ? product.protection_duration_days : undefined;
    const protectionDuration =
      data.protection_duration_days ?? productDuration ?? protocol.default_protection_duration_days;

    const normalizeText = (text?: string | null) => {
      if (typeof text !== 'string') return null;
      const t = text.trim();
      return t.length > 0 ? t : null;
    };

    if (data.document_storage_path) {
      const isValidDoc = await validatePetDocumentPath(user.id, petId, data.document_storage_path);
      if (!isValidDoc) {
        return NextResponse.json({ error: 'INVALID_DOCUMENT_PATH' }, { status: 400 });
      }
    }

    const { data: newRecord, error: insertError } = await adminClient
      .from('parasite_records')
      .insert({
        pet_id: petId,
        parasite_protocol_id: protocol.id,
        parasite_code: protocol.parasite_code,
        parasite_type: protocol.parasite_type,
        administered_at: data.administered_at,
        application_method: data.application_method,
        protection_duration_days: protectionDuration,
        brand_free_text: normalizeText(data.brand_free_text) ?? product?.brand ?? null,
        product_free_text: normalizeText(data.product_free_text) ?? product?.name ?? null,
        notes: normalizeText(data.notes),
        document_storage_path: data.document_storage_path || null,
        source: 'user_manual',
        created_by: user.id,
        plan_id: null,
        // Alan yalnızca ürün seçildiğinde gönderilir; Migration B canlıya
        // uygulanana kadar ürünsüz kayıt akışı aynen çalışmaya devam eder.
        ...(product ? { parasite_product_id: product.id } : {})
      })
      .select()
      .single();

    if (insertError || !newRecord) {
      return NextResponse.json({ error: 'PARASITE_RECORD_CREATE_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ record: newRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'PARASITE_RECORD_CREATE_FAILED' }, { status: 500 });
  }
}
