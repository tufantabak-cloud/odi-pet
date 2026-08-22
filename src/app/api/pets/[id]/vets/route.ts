import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: vets, error } = await supabase
      .from('pet_vets')
      .select('*')
      .eq('pet_id', id)
      .order('is_past', { ascending: true })
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API vets GET] Supabase error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json(vets || []);
  } catch (error: any) {
    console.error('[API vets GET] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Pet ID is required' }, { status: 400 });

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const payload = await req.json();

    const { data: vet, error } = await supabase
      .from('pet_vets')
      .insert({
        pet_id: id,
        ...payload
      })
      .select()
      .single();

    if (error) {
      console.error('[API vets POST] Supabase error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json(vet);
  } catch (error: any) {
    console.error('[API vets POST] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
