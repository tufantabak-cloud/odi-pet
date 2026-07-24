import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { agendaWriteRegistry } from '@/lib/agenda/write-handlers/registry';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();

    // Rejects user_id in request body for security
    if ('user_id' in body || 'userId' in body) {
      return NextResponse.json({ error: 'FORBIDDEN_USER_ID_IN_BODY' }, { status: 400 });
    }

    const { pet_id, category, input } = body;

    if (!pet_id || !category || !input) {
      return NextResponse.json({ error: 'INVALID_PARAMETERS' }, { status: 400 });
    }

    // Verify pet ownership
    const { data: pet, error: petErr } = await supabase
      .from('pets')
      .select('id')
      .eq('id', pet_id)
      .eq('owner_id', user.id)
      .single();

    if (petErr || !pet) {
      return NextResponse.json({ error: 'PET_NOT_FOUND_OR_FORBIDDEN' }, { status: 403 });
    }

    // Fetch active plans for pet
    const { data: plans, error: planErr } = await supabase
      .from('plans')
      .select('*')
      .eq('pet_id', pet_id)
      .eq('status', 'active');

    if (planErr) {
      return NextResponse.json({ error: 'DB_ERROR', details: planErr }, { status: 500 });
    }

    const handler = agendaWriteRegistry.getHandler(category);
    const matchResult = await handler.findMatchingPlans({ pet_id, ...input }, plans || []);

    return NextResponse.json(matchResult);
  } catch (error: any) {
    console.error('Error matching plan:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: error.message }, { status: 500 });
  }
}
