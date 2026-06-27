import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const supabase = await createServerSupabaseClient()

    const { data: application, error: fetchError } = await supabase
      .from('breeding_applications')
      .select('owner_user_id, applicant_pet_id, pets!breeding_applications_applicant_pet_id_fkey(name)')
      .eq('id', id)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 })
    }

    if (application.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Bu başvuruya erişim yetkiniz yok' }, { status: 403 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const { data: vaccines, error: vaccinesError } = await adminSupabase
      .from('vaccine_records_v2')
      .select('vaccine_name, administered_at, next_due_at, status')
      .eq('pet_id', application.applicant_pet_id)
      .order('administered_at', { ascending: false })
      .limit(10)

    if (vaccinesError) {
      return NextResponse.json({ error: 'Aşılar getirilirken hata oluştu' }, { status: 500 })
    }

    const petName = Array.isArray(application.pets) ? application.pets[0]?.name : (application.pets as any)?.name

    return NextResponse.json({
      pet_name: petName,
      vaccines: vaccines
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
