import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { withAPIFeatureGuard } from '@/lib/features/guards/APIFeatureGuard'

type RouteContext = {
  params: Promise<{ id: string }>
}

export const GET = withAPIFeatureGuard('social_adoption', async (req: NextRequest, context: RouteContext) => {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const supabase = await createServerSupabaseClient()



  // Sahiplik doğrulaması
  const { data: ownerRecord } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Benim beğendiklerim
  const { data: myLikes } = await supabase
    .from('pet_match_likes')
    .select('to_pet_id, created_at')
    .eq('from_pet_id', id)
    .eq('action', 'like')

  if (!myLikes || myLikes.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  const likedIds = myLikes.map(m => m.to_pet_id)

  // Beni beğenenler (benim beğendiklerim arasından)
  const { data: mutualLikes } = await supabase
    .from('pet_match_likes')
    .select('from_pet_id, created_at')
    .eq('to_pet_id', id)
    .eq('action', 'like')
    .in('from_pet_id', likedIds)

  if (!mutualLikes || mutualLikes.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  const mutualIds = mutualLikes.map(m => m.from_pet_id)

  // Eşleşen petlerin detaylarını getir
  const { data: matchedPets, error } = await supabase
    .from('pets')
    .select('id, name, breed, gender, city, avatar_url, birth_date')
    .in('id', mutualIds)

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  // Tarihleri eşleştirmek için myLikes ve mutualLikes verilerini birleştirerek döndürebiliriz
  // Şimdilik sadece pet listesi dönmek yeterli
  return NextResponse.json({ matches: matchedPets || [] })
})
