import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question_id, action } = body;
    const userId = session.user.id;

    if (!question_id || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch current stats
    const { data: stats, error: statsError } = await supabase
      .from('user_survey_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    let newStats = {
      user_id: userId,
      daily_questions_asked: 1,
      consecutive_skips: action === 'skipped' ? 1 : 0,
      last_question_asked_at: new Date().toISOString()
    };

    if (stats) {
      const lastDate = stats.last_question_asked_at ? new Date(stats.last_question_asked_at) : null;
      const today = new Date();
      let isSameDay = false;

      if (lastDate && 
          lastDate.getDate() === today.getDate() && 
          lastDate.getMonth() === today.getMonth() && 
          lastDate.getFullYear() === today.getFullYear()) {
        isSameDay = true;
      }

      newStats = {
        user_id: userId,
        daily_questions_asked: isSameDay ? (stats.daily_questions_asked + 1) : 1,
        consecutive_skips: action === 'skipped' ? (stats.consecutive_skips + 1) : 0,
        last_question_asked_at: new Date().toISOString()
      };
    }

    // 2. Upsert stats
    const { error: upsertError } = await supabase
      .from('user_survey_stats')
      .upsert(newStats, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Survey stats upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing profiling answer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
