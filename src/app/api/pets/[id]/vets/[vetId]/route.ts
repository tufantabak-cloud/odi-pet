import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(request: Request, context: any) {
  try {
    const { id, vetId } = context.params;
    if (!id || !vetId) return NextResponse.json({ error: 'Pet ID and Vet ID are required' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    const { data: vet, error } = await supabase
      .from('pet_vets')
      .update(payload)
      .eq('id', vetId)
      .eq('pet_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vet:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(vet);
  } catch (error: any) {
    console.error('Exception updating vet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
