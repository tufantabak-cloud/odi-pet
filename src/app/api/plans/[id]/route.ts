import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import { updatePlanSchema } from '@/lib/plans/schema';
import { updatePlan, deletePlan } from '@/lib/plans/service';
import { ZodError } from 'zod';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = updatePlanSchema.parse(body);

    const plan = await updatePlan(user.id, id, validatedData);
    
    return NextResponse.json({ plan });
  } catch (error: unknown) {
    console.error('[API/Plans PATCH] Error:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri gönderildi.', details: error.format() }, { status: 400 });
    }
    
    const message = error instanceof Error ? error.message : 'Plan güncellenirken bir hata oluştu.';
    const status = message.includes('yetkiniz yok') || message.includes('bulunamadı') ? 404 : 500;
    
    return NextResponse.json({ error: message }, { status });
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
