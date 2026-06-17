import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Vercel Cron verification
  const cronSecret = req.headers.get('x-cron-secret')
  
  if (cronSecret !== process.env.PLAN_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminSupabaseClient();
    
    // Find all plans that are due
    const now = new Date().toISOString();
    const { data: duePlans, error: fetchError } = await supabase
      .from('plans')
      .select('*')
      .lte('next_run', now)
      .not('repeat_rule', 'is', null);

    if (fetchError) throw fetchError;
    
    if (!duePlans || duePlans.length === 0) {
      return NextResponse.json({ message: 'No plans due', processed: 0 });
    }

    const newJobs = [];
    const planUpdates = [];

    for (const plan of duePlans) {
      // 1. Create a notification job
      newJobs.push({
        user_id: plan.user_id,
        pet_id: plan.pet_id,
        job_type: 'plan_reminder',
        payload: {
          plan_id: plan.id,
          category: plan.category,
          extra_data: plan.extra_data,
        },
        scheduled_for: now,
        status: 'pending'
      });

      // 2. Calculate next_run based on repeat_rule
      const currentNextRun = new Date(plan.next_run || now);
      let nextRun = new Date(currentNextRun);
      
      const rule = plan.repeat_rule || '';
      if (rule.includes('FREQ=DAILY')) {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (rule.includes('FREQ=WEEKLY')) {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (rule.includes('FREQ=MONTHLY')) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      } else if (rule.includes('FREQ=YEARLY')) {
        nextRun.setFullYear(nextRun.getFullYear() + 1);
      } else {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      if (nextRun < new Date()) {
        nextRun = new Date();
        if (rule.includes('FREQ=DAILY')) nextRun.setDate(nextRun.getDate() + 1);
        else if (rule.includes('FREQ=WEEKLY')) nextRun.setDate(nextRun.getDate() + 7);
        else if (rule.includes('FREQ=MONTHLY')) nextRun.setMonth(nextRun.getMonth() + 1);
        else if (rule.includes('FREQ=YEARLY')) nextRun.setFullYear(nextRun.getFullYear() + 1);
      }

      planUpdates.push({
        id: plan.id,
        next_run: nextRun.toISOString()
      });
    }

    // Insert notification jobs
    if (newJobs.length > 0) {
      const { error: jobsError } = await supabase
        .from('notification_jobs')
        .insert(newJobs);
        
      if (jobsError) throw jobsError;
    }

    // Update plans with their new next_run
    for (const update of planUpdates) {
      await supabase
        .from('plans')
        .update({ next_run: update.next_run })
        .eq('id', update.id);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Processed plans successfully', 
      processed: duePlans.length,
      jobs_created: newJobs.length 
    });

  } catch (error: any) {
    console.error('[CRON/Plans] Error:', error);
    return NextResponse.json({ error: error.message || 'Sunucu hatası.' }, { status: 500 });
  }
}
