import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vetId: string }> }
) {
  try {
    const { id, vetId } = await params;
    if (!id || !vetId) return NextResponse.json({ error: 'Pet ID and Vet ID are required' }, { status: 400 });

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const payload = await req.json();

    const { data: vet, error } = await supabase
      .from('pet_vets')
      .update(payload)
      .eq('id', vetId)
      .eq('pet_id', id)
      .select()
      .single();

    if (error) {
      console.error('[API vets PATCH] Supabase error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json(vet);
  } catch (error: any) {
    console.error('[API vets PATCH] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
