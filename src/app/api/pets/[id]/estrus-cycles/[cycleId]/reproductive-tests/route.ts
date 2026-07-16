import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId, cycleId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase.from('pet_owners').select('role').eq('pet_id', petId).eq('profile_id', user.id).single()
    if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data, error } = await supabase
      .from('pet_reproductive_tests')
      .select('*')
      .eq('pet_id', petId)
      .eq('cycle_id', cycleId)
      .order('sampled_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string, cycleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: petId, cycleId } = await context.params
    const supabase = await createServerSupabaseClient()

    // Sahiplik Doğrulaması
    const { data: ownerRecord } = await supabase.from('pet_owners').select('role').eq('pet_id', petId).eq('profile_id', user.id).single()
    if (!ownerRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // Döngü Kontrolü
    const { data: cycle } = await supabase.from('pet_estrus_cycles').select('start_date, end_date').eq('id', cycleId).eq('pet_id', petId).single()
    if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })

    const body = await req.json()
    const { 
      test_type, 
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
    
    if (!test_type || !sampled_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const todayDate = new Date()
    const sampleDate = new Date(sampled_at)
    const startDate = new Date(cycle.start_date)
    
    if (sampleDate > todayDate) {
      return NextResponse.json({ error: 'Test tarihi gelecekte olamaz.' }, { status: 400 })
    }
    if (sampleDate < startDate) {
      return NextResponse.json({ error: 'Test tarihi döngü başlangıcından önce olamaz.' }, { status: 400 })
    }
    if (cycle.end_date) {
      const endDate = new Date(cycle.end_date)
      endDate.setHours(23, 59, 59, 999)
      if (sampleDate > endDate) {
        return NextResponse.json({ error: 'Test tarihi kapalı döngü bitiş tarihinden sonra olamaz.' }, { status: 400 })
      }
    }

    // Constraints validation for clear error messages
    if (test_type === 'progesterone') {
      if (progesterone_value === undefined || progesterone_value === null || !progesterone_unit) {
        return NextResponse.json({ error: 'Progesteron değeri ve birimi zorunludur.' }, { status: 400 })
      }
      if (progesterone_value < 0) {
        return NextResponse.json({ error: 'Progesteron değeri negatif olamaz.' }, { status: 400 })
      }
      if (!['ng/mL', 'nmol/L'].includes(progesterone_unit)) {
        return NextResponse.json({ error: 'Geçersiz progesteron birimi.' }, { status: 400 })
      }
    } else if (test_type === 'vaginal_cytology') {
      if (!cytology_result && (cytology_superficial_percent === undefined || cytology_superficial_percent === null)) {
        return NextResponse.json({ error: 'Sitoloji sonucu veya yüzdesi gereklidir.' }, { status: 400 })
      }
      if (cytology_superficial_percent !== undefined && cytology_superficial_percent !== null) {
        if (cytology_superficial_percent < 0 || cytology_superficial_percent > 100) {
          return NextResponse.json({ error: 'Sitoloji yüzdesi 0-100 arasında olmalıdır.' }, { status: 400 })
        }
      }
    } else {
      return NextResponse.json({ error: 'Geçersiz test türü.' }, { status: 400 })
    }

    // Document storage path security
    let finalVerificationStatus = 'unverified'
    let finalStoragePath = null
    if (document_storage_path && !document_storage_path.startsWith('http://') && !document_storage_path.startsWith('https://')) {
      const expectedPath = `${user.id}/${petId}/`
      if (document_storage_path.startsWith(expectedPath)) {
        const folder = document_storage_path.substring(0, document_storage_path.lastIndexOf('/'))
        const filename = document_storage_path.substring(document_storage_path.lastIndexOf('/') + 1)
        const { data: fileList, error: listError } = await supabase.storage.from('pet-documents').list(folder, { search: filename })
        
        if (!listError && fileList && fileList.some(f => f.name === filename)) {
          finalStoragePath = document_storage_path
          finalVerificationStatus = 'document_attached'
        }
      }
    }

    const { data, error } = await supabase.from('pet_reproductive_tests').insert({
      pet_id: petId,
      cycle_id: cycleId,
      test_type,
      sampled_at,
      progesterone_value: test_type === 'progesterone' ? progesterone_value : null,
      progesterone_unit: test_type === 'progesterone' ? progesterone_unit : null,
      cytology_superficial_percent: test_type === 'vaginal_cytology' ? (cytology_superficial_percent ?? null) : null,
      cytology_result: test_type === 'vaginal_cytology' ? (cytology_result || null) : null,
      veterinarian_name: veterinarian_name || null,
      clinic_name: clinic_name || null,
      laboratory_name: laboratory_name?.trim() || null,
      assay_method: assay_method?.trim() || null,
      analyzer_name: analyzer_name?.trim() || null,
      reference_range: reference_range?.trim() || null,
      sample_identifier: sample_identifier?.trim() || null,
      document_storage_path: finalStoragePath,
      verification_status: finalVerificationStatus,
      created_by: user.id
    }).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
