import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request, context: any) {
  try {
    const { id } = context.params;
    if (!id) return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: vets, error } = await supabase
      .from('pet_vets')
      .select('*')
      .eq('pet_id', id)
      .order('is_past', { ascending: true })
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(vets);
  } catch (error: any) {
    console.error('Exception fetching vets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: any) {
  try {
    const { id } = context.params;
    if (!id) return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    const { data: vet, error } = await supabase
      .from('pet_vets')
      .insert({
        pet_id: id,
        ...payload
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vet:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(vet);
  } catch (error: any) {
    console.error('Exception creating vet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
