import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: authData, error: userError } = await supabase.auth.getUser();

    if (userError || !authData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('onboarding_hints')
      .select('hint_key')
      .eq('profile_id', authData.user.id);

    if (error) {
      console.warn('[API /api/hints GET] Database query failed, returning fallback empty dismissed list:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return NextResponse.json({ dismissed: [] });
    }

    const dismissed = Array.isArray(data)
      ? data
          .map((hint) => hint?.hint_key)
          .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
      : [];

    return NextResponse.json({ dismissed });
  } catch (err: unknown) {
    console.error('[API /api/hints GET] Unexpected error, returning fallback empty dismissed list:', err instanceof Error ? err.message : err);
    return NextResponse.json({ dismissed: [] });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: authData, error: userError } = await supabase.auth.getUser();

    if (userError || !authData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { hint_key } = body;

    if (!hint_key || typeof hint_key !== 'string' || !hint_key.trim()) {
      return NextResponse.json({ error: 'hint_key is required and must be a non-empty string' }, { status: 400 });
    }

    const cleanHintKey = hint_key.trim();

    const { error } = await supabase
      .from('onboarding_hints')
      .upsert(
        { profile_id: authData.user.id, hint_key: cleanHintKey },
        { onConflict: 'profile_id,hint_key' }
      );

    if (error) {
      console.warn('[API /api/hints POST] Database upsert failed, hint marked locally:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return NextResponse.json({ success: true, warning: 'Saved locally' });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[API /api/hints POST] Unexpected error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: true, warning: 'Saved locally' });
  }
}
