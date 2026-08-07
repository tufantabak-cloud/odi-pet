import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withAPIFeatureGuard } from '@/lib/features/guards/APIFeatureGuard'

export const dynamic = 'force-dynamic'

async function analysisHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const petId = searchParams.get('petId')

  if (!petId) return NextResponse.json({ error: 'Missing petId' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  
  // Premium-only Analysis: Son 30 günlük beslenme eğilimleri
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: logs } = await supabase
    .from('nutrition_logs')
    .select('id, date, food_logged, water_logged, notes')
    .eq('pet_id', petId)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: false })

  const totalLogs = logs?.length || 0
  const foodDays = logs?.filter(l => l.food_logged).length || 0
  const waterDays = logs?.filter(l => l.water_logged).length || 0

  return NextResponse.json({
    success: true,
    analysis: {
      total_recorded_days: totalLogs,
      food_consistency: totalLogs > 0 ? Math.round((foodDays / totalLogs) * 100) : 0,
      water_consistency: totalLogs > 0 ? Math.round((waterDays / totalLogs) * 100) : 0,
      recent_logs: logs?.slice(0, 5)
    }
  })
}

export const GET = withAPIFeatureGuard('nutrition_analysis', analysisHandler);

