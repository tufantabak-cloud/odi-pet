import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import { updatePlanSchema } from '@/lib/plans/schema';
import { updatePlan, deletePlan, completeParasitePlan } from '@/lib/plans/service';
import { ZodError, z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { id } = await params;
    const { createAdminSupabaseClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminSupabaseClient();
    
    const { data: plan, error: planErr } = await adminClient
      .from('plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (planErr || !plan) {
      return NextResponse.json({ error: 'PLAN_NOT_FOUND' }, { status: 404 });
    }

    const { data: petOwner, error: ownerErr } = await adminClient
      .from('pet_owners')
      .select('id')
      .eq('pet_id', plan.pet_id)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (ownerErr || !petOwner) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    if (plan.category !== 'parazit') {
      return NextResponse.json({ error: 'NOT_PARASITE_PLAN' }, { status: 400 });
    }

    let protoId = plan.extra_data?.parasite_protocol_id;
    if (!protoId && plan.extra_data?.product?.id) {
      protoId = plan.extra_data.product.id;
    }

    if (!protoId) {
      return NextResponse.json({ error: 'PROTOCOL_NOT_FOUND' }, { status: 400 });
    }

    const { data: proto, error: protoErr } = await adminClient
      .from('parasite_protocols')
      .select('*')
      .eq('id', protoId)
      .maybeSingle();

    if (protoErr || !proto) {
      return NextResponse.json({ error: 'PROTOCOL_NOT_FOUND' }, { status: 400 });
    }

    // Planlarken katalogdan bir ürün seçildiyse (extra_data.planned_product),
    // tamamlama formu markayı/ürün adını ve gerçek süreyi ön-doldurabilsin diye
    // döndürülür. Protokol varsayılanı ayrı alanda korunur (fallback).
    const plannedProduct = plan.extra_data?.planned_product ?? null;

    return NextResponse.json({
      plan_id: plan.id,
      category: 'parazit',
      protocol_name: proto.protocol_name,
      allowed_application_methods: proto.allowed_application_methods,
      default_application_method: proto.default_application_method,
      default_protection_duration_days: proto.default_protection_duration_days,
      planned_product: plannedProduct
    });
  } catch (error) {
    console.error('[API/Plans GET] Error:', error);
    return NextResponse.json({ error: 'PLAN_COMPLETION_FAILED' }, { status: 500 });
  }
}

const parasiteCompletionSchema = z.object({
  administered_at: z.string(),
  application_method: z.string(),
  brand_free_text: z.string().nullable().optional(),
  product_free_text: z.string().nullable().optional(),
  protection_duration_days: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  document_storage_path: z.string().nullable().optional(),
}).strict();

const parasiteCompletionSpecificKeys = [
  'administered_at',
  'application_method',
  'brand_free_text',
  'product_free_text',
  'protection_duration_days',
  'document_storage_path',
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const hasParasiteCompletionField = parasiteCompletionSpecificKeys.some((key) =>
      Object.prototype.hasOwnProperty.call(body, key)
    );

    if (hasParasiteCompletionField) {
      // 1. Fetch current plan to check its category
      const { createAdminSupabaseClient } = await import('@/lib/supabase/server');
      const adminClient = createAdminSupabaseClient();
      const { data: currentPlan } = await adminClient
        .from('plans')
        .select('category')
        .eq('id', id)
        .maybeSingle();

      if (!currentPlan) {
        return NextResponse.json({ error: 'PLAN_NOT_FOUND' }, { status: 404 });
      }

      if (currentPlan.category !== 'parazit') {
        return NextResponse.json({ error: 'NOT_PARASITE_PLAN' }, { status: 400 });
      }

      // 2. Run strict completion validation
      const parseResult = parasiteCompletionSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json({ error: 'INVALID_APPLICATION_DATA' }, { status: 400 });
      }

      // 3. Call isolated completeParasitePlan service
      const completedInfo = await completeParasitePlan(user.id, id, parseResult.data);
      return NextResponse.json({ plan: completedInfo });
    }

    // Standard plan update flow
    const validatedData = updatePlanSchema.parse(body);
    const plan = await updatePlan(user.id, id, validatedData);
    
    return NextResponse.json({ plan });
  } catch (error: unknown) {
    console.error('[API/Plans PATCH] Error:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri gönderildi.', details: error.format() }, { status: 400 });
    }
    
    const message = error instanceof Error ? error.message : 'PLAN_COMPLETION_FAILED';
    let status = 500;
    let errorKey = message;

    if (message === 'UNAUTHORIZED') {
      status = 401;
    } else if (message === 'FORBIDDEN' || message.includes('yetkiniz yok')) {
      status = 403;
      errorKey = 'FORBIDDEN';
    } else if (message === 'PLAN_NOT_FOUND' || message.includes('bulunamadı')) {
      status = 404;
      errorKey = 'PLAN_NOT_FOUND';
    } else if (
      [
        'NOT_PARASITE_PLAN',
        'PLAN_CANCELLED',
        'PROTOCOL_NOT_FOUND',
        'INVALID_APPLICATION_DATA',
        'INVALID_APPLICATION_METHOD',
        'PARASITE_RECORD_CREATE_FAILED',
        'PLAN_COMPLETION_FAILED'
      ].includes(message)
    ) {
      status = 400;
    } else {
      status = 500;
      errorKey = 'PLAN_COMPLETION_FAILED';
    }
    
    return NextResponse.json({ error: errorKey }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { id } = await params;
    
    await deletePlan(id);
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[API/Plans DELETE] Error:', error);
    return NextResponse.json({ error: 'Plan silinirken bir hata oluştu.' }, { status: 500 });
  }
}
