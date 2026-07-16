import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string, testId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId, cycleId, testId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase.from('pet_owners').select('role').eq('pet_id', petId).eq('profile_id', user.id).single()
    if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data: testRecord } = await supabase.from('pet_reproductive_tests').select('*').eq('id', testId).eq('pet_id', petId).eq('cycle_id', cycleId).single()
    if (!testRecord) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    if (testRecord.verification_status === 'verified') {
      return NextResponse.json({ error: 'Bu onaylı test kaydı üzerinde değişiklik yapılamaz.', code: 'VERIFIED_TEST_LOCKED' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      sampled_at,
      progesterone_value, 
      progesterone_unit, 
      cytology_superficial_percent, 
      cytology_result,
      veterinarian_name,
      clinic_name,
      document_storage_path,
      laboratory_name,
      assay_method,
      analyzer_name,
      reference_range,
      sample_identifier
    } = body

    const updates: any = {}
    
    if (sampled_at !== undefined) {
      const { data: cycle } = await supabase.from('pet_estrus_cycles').select('start_date, end_date').eq('id', cycleId).single()
      if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
      
      const todayDate = new Date()
      const sampleDate = new Date(sampled_at)
      const startDate = new Date(cycle.start_date)
      
      if (sampleDate > todayDate) return NextResponse.json({ error: 'Test tarihi gelecekte olamaz.' }, { status: 400 })
      if (sampleDate < startDate) return NextResponse.json({ error: 'Test tarihi döngü başlangıcından önce olamaz.' }, { status: 400 })
      if (cycle.end_date) {
        const endDate = new Date(cycle.end_date)
        endDate.setHours(23, 59, 59, 999)
        if (sampleDate > endDate) return NextResponse.json({ error: 'Test tarihi kapalı döngü bitiş tarihinden sonra olamaz.' }, { status: 400 })
      }
      updates.sampled_at = sampled_at
    }
    
    // Progesterone updates
    if (testRecord.test_type === 'progesterone') {
      if (progesterone_value !== undefined) {
        if (progesterone_value < 0) return NextResponse.json({ error: 'Progesteron değeri negatif olamaz.' }, { status: 400 })
        updates.progesterone_value = progesterone_value
      }
      if (progesterone_unit !== undefined) {
        if (!['ng/mL', 'nmol/L'].includes(progesterone_unit)) return NextResponse.json({ error: 'Geçersiz progesteron birimi.' }, { status: 400 })
        updates.progesterone_unit = progesterone_unit
      }
    }

    // Cytology updates
    if (testRecord.test_type === 'vaginal_cytology') {
      if (cytology_superficial_percent !== undefined && cytology_superficial_percent !== null) {
        if (cytology_superficial_percent < 0 || cytology_superficial_percent > 100) return NextResponse.json({ error: 'Sitoloji yüzdesi 0-100 arasında olmalıdır.' }, { status: 400 })
        updates.cytology_superficial_percent = cytology_superficial_percent
      }
      if (cytology_result !== undefined) updates.cytology_result = cytology_result || null
    }

    if (veterinarian_name !== undefined) updates.veterinarian_name = veterinarian_name || null
    if (clinic_name !== undefined) updates.clinic_name = clinic_name || null
    if (laboratory_name !== undefined) updates.laboratory_name = laboratory_name?.trim() || null
    if (assay_method !== undefined) updates.assay_method = assay_method?.trim() || null
    if (analyzer_name !== undefined) updates.analyzer_name = analyzer_name?.trim() || null
    if (reference_range !== undefined) updates.reference_range = reference_range?.trim() || null
    if (sample_identifier !== undefined) updates.sample_identifier = sample_identifier?.trim() || null

    if (document_storage_path !== undefined) {
      if (document_storage_path === null || document_storage_path === '') {
        updates.document_storage_path = null
        updates.verification_status = 'unverified'
      } else if (!document_storage_path.startsWith('http://') && !document_storage_path.startsWith('https://')) {
        const expectedPath = `${user.id}/${petId}/`
        if (document_storage_path.startsWith(expectedPath)) {
          const folder = document_storage_path.substring(0, document_storage_path.lastIndexOf('/'))
          const filename = document_storage_path.substring(document_storage_path.lastIndexOf('/') + 1)
          const { data: fileList, error: listError } = await supabase.storage.from('pet-documents').list(folder, { search: filename })
          
          if (!listError && fileList && fileList.some(f => f.name === filename)) {
            updates.document_storage_path = document_storage_path
            updates.verification_status = 'document_attached'
          }
        }
      }
    }

    if (testRecord.verification_status === 'rejected' && updates.verification_status === undefined) {
      updates.verification_status = testRecord.document_storage_path ? 'document_attached' : 'unverified'
    }

    const { data, error } = await supabase
      .from('pet_reproductive_tests')
      .update(updates)
      .eq('id', testId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string, testId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId, cycleId, testId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase.from('pet_owners').select('role').eq('pet_id', petId).eq('profile_id', user.id).single()
    if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data: testRecord } = await supabase.from('pet_reproductive_tests').select('verification_status').eq('id', testId).eq('pet_id', petId).eq('cycle_id', cycleId).single()
    if (!testRecord) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    if (testRecord.verification_status === 'verified') {
      return NextResponse.json({ error: 'Bu onaylı test kaydı silinemez.', code: 'VERIFIED_TEST_LOCKED' }, { status: 403 })
    }

    const { error } = await supabase
      .from('pet_reproductive_tests')
      .delete()
      .eq('id', testId)
      .eq('pet_id', petId)
      .eq('cycle_id', cycleId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
