import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// MOCK: Assuming the Vet logs in and we know their ID
// In a real app, this would use getSessionUser() and lookup the vet profile
const getMockVetId = () => '00000000-0000-0000-0000-000000000001' // Placeholder

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  
  // 3. GÖREV HAVUZU (CORE ENGINE) - Fetch pending
  const { data: reviews, error } = await supabase
    .from('vet_reviews')
    .select('*, predictive_insights(*, pets(name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: true }) // FIFO
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, queue: reviews })
}
