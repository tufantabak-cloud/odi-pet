import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { generateReproductiveForecast } from '@/services/estrus/generateReproductiveForecast'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase
      .from('pet_owners')
      .select('role')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .single()

    if (!ownerRecord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Doğrudan servisi çağır, veritabanına sadece backend'den erişiyor
    const forecast = await generateReproductiveForecast(petId)

    // Ham notlar veya belge yolları içermediğinden emin olduğumuz ReproductiveForecast sözleşmesini dönüyoruz
    return NextResponse.json({ data: forecast }, { status: 200 })

  } catch (err: any) {
    console.error('Forecast API error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
