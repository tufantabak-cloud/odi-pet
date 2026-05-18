import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('onboarding_hints')
    .select('hint_key')
    .eq('profile_id', session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dismissed = data.map(hint => hint.hint_key);
  return NextResponse.json({ dismissed });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { hint_key } = await request.json();

    if (!hint_key) {
      return NextResponse.json({ error: 'hint_key is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('onboarding_hints')
      .upsert({ profile_id: session.user.id, hint_key }, { onConflict: 'profile_id,hint_key' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
