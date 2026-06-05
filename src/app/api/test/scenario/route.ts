import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(req: NextRequest) {
  // Test senaryoları sadece admin ortamında çalışmalı
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'founder'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { petId, scenario } = body

  if (!petId || !scenario) {
    return NextResponse.json({ error: 'Missing petId or scenario' }, { status: 400 })
  }

  const today = new Date()
  const yesterdayStr = new Date(today.getTime() - 24*60*60*1000).toISOString().split('T')[0]

  switch (scenario) {
    case "OVERDUE_CRISIS":
      // 2 overdue + 1 postpone
      const { data: overTasks } = await supabase.from('health_schedules').select('id').eq('pet_id', petId).limit(3)
      if (overTasks && overTasks.length >= 3) {
        await supabase.from('health_schedules').update({ due_date: yesterdayStr, status: 'upcoming' }).in('id', [overTasks[0].id, overTasks[1].id])
        await supabase.from('health_schedules').update({ postpone_count: 1 }).eq('id', overTasks[2].id)
      }
      break;

    case "INACTIVITY":
      // 2 gün hiçbir log yok
      await supabase.from('daily_scores').delete().eq('pet_id', petId)
      break;

    case "POSTPONE_LOOP":
      // aynı task 3 kez ertelenmiş
      const { data: loopTasks } = await supabase.from('health_schedules').select('id').eq('pet_id', petId).limit(1)
      if (loopTasks && loopTasks.length > 0) {
        await supabase.from('health_schedules').update({ postpone_count: 3 }).eq('id', loopTasks[0].id)
      }
      break;

    case "PERFECT_DAY":
      // tüm görevler tamam
      await supabase.from('health_schedules').update({ status: 'done' }).eq('pet_id', petId)
      await supabase.from('daily_scores').upsert({ pet_id: petId, date: today.toISOString().split('T')[0], score: 100 })
      break;

    case "CACHE_TEST":
      // hiçbir değişiklik yapma
      break;

    case "FORCE_REFRESH":
      const { data: frTask } = await supabase.from('health_schedules').select('id').eq('pet_id', petId).neq('status', 'done').limit(1)
      if (frTask && frTask.length > 0) {
        await supabase.from('health_schedules').update({ status: 'done' }).eq('id', frTask[0].id)
      }
      break;
  }

  // Tetikleme sonrasi motoru manuel olarak ?force=true ile cagir
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const res = await fetch(`${origin}/api/predictive-risk/${petId}?force=true`)
  const result = await res.json()

  return NextResponse.json({ success: true, scenario, result })
}
