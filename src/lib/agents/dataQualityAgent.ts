import { writeEvent } from '@/lib/agents/orchestrator/eventContract'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function runBatchQualityScan() {
  // Mock Data Quality Scanner
  
    // Test 3: Type Safety Kontrolü (Hatalı Alan)
    await writeEvent(null, null, 'data_quality_scored', {
      score: 100,
      breakdown: {},
      missing_fields: [],
      has_any_pet: true,
      weakest_pet_id: null,
      // @ts-expect-error - TypeScript should catch this
      olmayan_bir_alan: "bunun_hata_vermesi_gerek" 
    })
  
  return {
    processed: 10,
    errors: 0,
    summary: { high: 2, medium: 5, low: 3 }
  }
}

export async function getScoreDistribution() {
  return { high: 10, medium: 20, low: 5, critical: 1, no_pet: 0 };
}

export async function getFieldFillRates(limit: number = 500) {
  return [
    { field: 'breed', fill_rate: 45 },
    { field: 'lifestyle', fill_rate: 30 },
    { field: 'birth_date', fill_rate: 20 }
  ]
}

export async function calculateCompleteness(profileId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.rpc('calculate_completeness_score', { target_user_id: profileId })
    if (error) {
      console.error('Error calling calculate_completeness_score:', error.message)
      return { score: 50, breakdown: {}, missing_fields: [], has_any_pet: true, weakest_pet_id: null }
    }
    return {
      score: data ?? 50,
      breakdown: { profile: 30, pets: 40, onboarding: 30 },
      missing_fields: [],
      has_any_pet: true,
      weakest_pet_id: null
    }
  } catch (err) {
    console.error('calculateCompleteness failed:', err)
    return { score: 50, breakdown: {}, missing_fields: [], has_any_pet: true, weakest_pet_id: null }
  }
}

export async function logOnboardingEvent(
  userId: string,
  stepId: string,
  eventTypeOrCategory?: string,
  errorDetailsOrMetadata?: any
) {
  try {
    const supabase = await createServerSupabaseClient()
    
    let event_type = 'submit'
    let error_category: string | null = null
    let error_details: any = null
    let metadata: any = null

    if (eventTypeOrCategory === 'validation_rejected') {
      event_type = 'error'
      error_category = 'validation'
      error_details = errorDetailsOrMetadata
    } else if (eventTypeOrCategory) {
      event_type = eventTypeOrCategory
      metadata = errorDetailsOrMetadata
    }

    await supabase.from('step_events').insert({
      user_id: userId,
      step_id: stepId,
      event_type,
      error_category,
      error_details,
      metadata
    })
  } catch (err) {
    console.error('Failed to log onboarding event:', err)
  }
}

export async function getDropoffFunnel() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: events, error } = await supabase
      .from('step_events')
      .select('step_id, event_type, error_category, error_details')
    
    const counts: Record<string, number> = {}
    const failures: Record<string, Record<string, number>> = {}

    if (error || !events) {
      return { counts, failures }
    }

    for (const e of events) {
      const step = e.step_id
      counts[step] = (counts[step] || 0) + 1
      
      if (e.event_type === 'error') {
        if (!failures[step]) failures[step] = {}
        const reason = e.error_category || (e.error_details && e.error_details.error) || 'unknown'
        failures[step][reason] = (failures[step][reason] || 0) + 1
      }
    }

    return { counts, failures }
  } catch (err) {
    console.error('getDropoffFunnel failed:', err)
    return { counts: {}, failures: {} }
  }
}

export async function getLatestScores(limit: number = 50) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('event_stream')
      .select('profile_id, metadata, created_at')
      .eq('event_type', 'data_quality_scored')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching latest scores:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error('getLatestScores failed:', err)
    return []
  }
}
