import { NextResponse } from 'next/server';
import {
  createAdminSupabaseClient,
  createServerSupabaseClient
} from '@/lib/supabase/server';
import { processRecordCreation } from '@/lib/agenda/write-handlers/write-service';
import { persistApplicationDetails } from '@/lib/agenda/write-handlers/persist-application-details';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'INVALID_JSON_BODY' }, { status: 400 });
    }

    // Rejects user_id in request body for security
    if ('user_id' in body || 'userId' in body) {
      return NextResponse.json({ error: 'FORBIDDEN_USER_ID_IN_BODY' }, { status: 400 });
    }

    const { pet_id, category, input, idempotencyKey, selectedPlanId, applicationDetails } = body;

    if (!pet_id || !category || !input || !idempotencyKey) {
      return NextResponse.json({ error: 'INVALID_PARAMETERS' }, { status: 400 });
    }

    if (applicationDetails !== undefined && category !== 'asi' && category !== 'parazit') {
      return NextResponse.json({ error: 'INVALID_APPLICATION_DETAILS_CATEGORY' }, { status: 400 });
    }

    // Verify UUID format for idempotencyKey
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      return NextResponse.json({ error: 'INVALID_IDEMPOTENCY_KEY' }, { status: 400 });
    }

    // Ana sahip ve pet_owners tablosundaki ortak sahipler desteklenir.
    const [
      { data: primaryOwner },
      { data: sharedOwner }
    ] = await Promise.all([
      supabase
        .from('pets')
        .select('id')
        .eq('id', pet_id)
        .eq('owner_id', user.id)
        .maybeSingle(),
      supabase
        .from('pet_owners')
        .select('id')
        .eq('pet_id', pet_id)
        .eq('profile_id', user.id)
        .maybeSingle()
    ]);

    if (!primaryOwner && !sharedOwner) {
      return NextResponse.json(
        { error: 'PET_NOT_FOUND_OR_FORBIDDEN' },
        { status: 403 }
      );
    }

    // Service role yalnızca oturum ve sahiplik doğrulamasından sonra atomik
    // RPC çağrılarında kullanılır. Plan sorguları kullanıcı oturumuyla ve
    // mevcut RLS politikalarıyla çalışmaya devam eder.
    const rpcSupabase = createAdminSupabaseClient();

    // Process record creation via atomic write service
    const { result, matchResult } = await processRecordCreation(
      category,
      input,
      {
        supabase,
        petId: pet_id,
        userId: user.id,
        timeZone: 'Europe/Istanbul',
        idempotencyKey,
        rpcSupabase
      },
      selectedPlanId
    );

    if (category === 'asi' || category === 'parazit') {
      await persistApplicationDetails({
        category,
        rawDetails: applicationDetails,
        recordId: result.recordId,
        petId: pet_id,
        userId: user.id,
        supabase,
      });
    }

    return NextResponse.json({
      success: true,
      result,
      matchResult
    });
  } catch (error: any) {
    console.error('Error in /api/agenda/write:', error);
    
    // User-friendly error code translation
    const msg = error.message || '';
    let userMsg = 'Kayıt oluşturulurken bir hata oluştu.';
    if (msg.includes('MAIN_PLAN_NOT_FOUND_OR_INVALID') || msg.includes('INVALID_OCCURRENCE')) {
      userMsg = 'Eşleşen görev artık güncel değil. Lütfen tekrar kontrol edin.';
    } else if (msg.includes('IDEMPOTENCY_KEY_CONTEXT_CONFLICT') || msg.includes('OCCURRENCE_RECORD_CONFLICT')) {
      userMsg = 'Bu kayıt farklı bir görev bağlamında zaten işlenmiş.';
    } else if (msg.includes('NEXT_SCHEDULED_AT_REQUIRED')) {
      userMsg = 'Sonraki tarih hesaplanamadı.';
    } else if (msg.includes('PLAN_RECORD_IDENTITY_MISMATCH')) {
      userMsg = 'Seçilen görev bu kayıtla uyuşmuyor.';
    } else if (msg.includes('INVALID_APPLICATION_METHOD')) {
      userMsg = 'Geçersiz uygulama yöntemi seçildi.';
    }

    return NextResponse.json({
      error: 'WRITE_ERROR',
      message: userMsg
    }, { status: 400 });
  }
}
