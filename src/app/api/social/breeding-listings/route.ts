import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { cityDistanceKm } from '@/lib/utils/turkiyeIller'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  const supabase = createAdminSupabaseClient()
  
  const searchParams = req.nextUrl.searchParams
  const species = searchParams.get('species')
  const gender = searchParams.get('gender')
  const city = searchParams.get('city')
  const breed = searchParams.get('breed')
  const estrus = searchParams.get('estrus')
  
  const maxDistanceKm = searchParams.get('maxDistanceKm') ? Number(searchParams.get('maxDistanceKm')) : null
  const userCity = searchParams.get('userCity')
  
  let query = supabase
    .from('breeding_listings')
    .select('*, pets!inner(id, name, species, breed, avatar_url, city, birth_date, gender)')
    .eq('status', 'active')
    
  if (user) {
    query = query.neq('user_id', user.id)
  }

  if (species && species !== 'Tümü') {
    query = query.eq('pets.species', species === 'Kedi' ? 'Kedi' : 'Köpek')
  }
  if (gender && gender !== 'Tümü') {
    query = query.eq('pets.gender', gender === 'Erkek' ? 'male' : 'female')
  }
  if (city && city.trim().length > 0 && !maxDistanceKm) {
    query = query.ilike('pets.city', `%${city.trim()}%`)
  }
  if (breed && breed.trim().length > 0) {
    query = query.ilike('pets.breed', `%${breed.trim()}%`)
  }
  if (estrus === 'true') {
    const today = new Date().toISOString().split('T')[0]
    const { data: estrusPets } = await supabase
      .from('pet_estrus_cycles')
      .select('pet_id')
      .lte('start_date', today)
      .gte('end_date', today)
    
    const estrusPetIds = estrusPets?.map((e: any) => e.pet_id) ?? []
    if (estrusPetIds.length > 0) {
      query = query.in('pet_id', estrusPetIds)
    } else {
      return NextResponse.json({ data: [] })
    }
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(50) // limit'i artırıyoruz çünkü mesafe filtresi JS tarafında eliyor

  if (error) {
    console.error('Breeding listings error:', error)
    return NextResponse.json({ error: 'İlanlar getirilemedi.' }, { status: 500 })
  }

  let formattedData = data || []

  if (maxDistanceKm !== null && userCity) {
    formattedData = formattedData
      .map((item: any) => {
        const itemCity = item.pets?.city || ''
        const dist = cityDistanceKm(userCity, itemCity)
        return {
          ...item,
          distance_km: dist !== null ? dist : undefined
        }
      })
      .filter((item: any) => item.distance_km !== undefined && item.distance_km <= maxDistanceKm)
      .sort((a: any, b: any) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
  }

  return NextResponse.json({ data: formattedData.slice(0, 20) })
}
