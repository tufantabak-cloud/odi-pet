import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: pet } = await supabase.from('pets').select('owner_id').eq('id', id).single();
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== pet.owner_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: prefs } = await supabase
      .from('pet_estrus_preferences')
      .select('reminders_enabled')
      .eq('pet_id', id)
      .single();

    if (!prefs) {
      return NextResponse.json({ reminders_enabled: true });
    }

    return NextResponse.json(prefs);
  } catch (error) {
    console.error('[GET Estrus Preferences]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    if (typeof body.reminders_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    
    const { data: pet } = await supabase.from('pets').select('owner_id').eq('id', id).single();
    if (!pet) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== pet.owner_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const adminSupabase = createAdminSupabaseClient();

    const { error } = await adminSupabase
      .from('pet_estrus_preferences')
      .upsert({
        pet_id: id,
        reminders_enabled: body.reminders_enabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'pet_id' });

    if (error) {
      console.error('[PUT Estrus Preferences Upsert Error]', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT Estrus Preferences]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
