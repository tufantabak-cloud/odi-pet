import { NextResponse } from 'next/server'
import { getSessionUser, getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  const profile = await getCurrentProfile()

  if (!user || !profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()

  // 1. Evcil hayvanları çek (arşivlenmemişler ve arşivlenmişler dahil tam kullanıcı verisi)
  const { data: pets } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', profile.id)

  const petIds = (pets || []).map(p => p.id)

  // 2. Petlere ait sağlık, aşı ve ajanda verileri
  const [
    { data: vaccines },
    { data: parasites },
    { data: weightLogs },
    { data: plans },
    { data: appointments },
    { data: nutritionProfiles },
  ] = await Promise.all([
    petIds.length > 0 ? supabase.from('vaccine_records_v2').select('*').in('pet_id', petIds) : { data: [] },
    petIds.length > 0 ? supabase.from('parasite_records').select('*').in('pet_id', petIds) : { data: [] },
    petIds.length > 0 ? supabase.from('weight_logs').select('*').in('pet_id', petIds) : { data: [] },
    petIds.length > 0 ? supabase.from('plans').select('*').in('pet_id', petIds) : { data: [] },
    petIds.length > 0 ? supabase.from('appointments').select('*').in('pet_id', petIds) : { data: [] },
    petIds.length > 0 ? supabase.from('pet_nutrition_profiles').select('*').in('pet_id', petIds) : { data: [] },
  ])

  // 3. Kullanıcı verisi paketi (KVKK / GDPR ve TestSprite CAL-027, PET-014 standartlarına uygun)
  const exportPayload = {
    owner: {
      id: profile.id,
      email: user.email || profile.email || '',
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || '',
      role: profile.role || 'owner',
      created_at: profile.created_at,
    },
    pets: (pets || []).map(pet => ({
      ...pet,
      vaccines: (vaccines || []).filter(v => v.pet_id === pet.id),
      parasites: (parasites || []).filter(p => p.pet_id === pet.id),
      weight_logs: (weightLogs || []).filter(w => w.pet_id === pet.id),
      plans: (plans || []).filter(pl => pl.pet_id === pet.id),
      appointments: (appointments || []).filter(a => a.pet_id === pet.id),
      nutrition_profile: (nutritionProfiles || []).find(n => n.pet_id === pet.id) || null,
    })),
    exported_at: new Date().toISOString(),
    platform: 'Odi.Pet',
    version: '1.0',
  }

  const jsonString = JSON.stringify(exportPayload, null, 2)

  return new NextResponse(jsonString, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="odi-personal-data.json"',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
