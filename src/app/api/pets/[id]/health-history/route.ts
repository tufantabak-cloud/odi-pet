import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    // Sahiplik kontrolü
    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', id)
      .eq('profile_id', profile.id)
      .single()

    if (!ownership && profile.role !== 'admin' && profile.role !== 'founder') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { vaccine_answers } = body
    
    if (!Array.isArray(vaccine_answers)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const tasks: any[] = []

    for (const item of vaccine_answers) {
      const { 
        vaccine_code, 
        vaccine_name, 
        category, 
        dose_count, 
        recurrence_days, 
        has_annual_booster, 
        answer, 
        user_date, 
        is_approximate 
      } = item

      const mappedCategory = category === 'parasite' ? 'parazit' : 'asi'
      const baseExtraData = {
        vaccine: { code: vaccine_code, name: vaccine_name },
        vaccination_history_wizard: true
      }

      // Parazitler her zaman bugünden itibaren 3 döngü planlanır (tarih sorulmaz)
      if (category === 'parasite') {
        const rDays = recurrence_days ?? 30
        const firstDoseDate = new Date()
        for (let occurrence = 0; occurrence < 3; occurrence++) {
          const scheduledDate = new Date(firstDoseDate)
          scheduledDate.setDate(firstDoseDate.getDate() + occurrence * rDays)
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: vaccine_name,
            scheduled_at: scheduledDate.toISOString(),
            status: 'active',
            extra_data: { ...baseExtraData, auto_generated: true }
          })
        }
        continue
      }

      // Aşı Senaryoları
      if (answer === 'ask_vet') {
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)
        tasks.push({
          pet_id: id,
          category: 'saglik',
          sub_type: 'Hatırlatma',
          title: `${vaccine_name} karnesi veterinere sor`,
          scheduled_at: nextWeek.toISOString(),
          status: 'active',
          extra_data: { source: 'user_input', vaccination_history_wizard: true }
        })
      } 
      else if (answer === 'yes') {
        if (is_approximate) {
          // Tarih bilinmiyor (Hatırlamıyorum)
          if (has_annual_booster) {
            const nextYear = new Date()
            nextYear.setFullYear(nextYear.getFullYear() + 1)
            tasks.push({
              pet_id: id,
              category: mappedCategory,
              sub_type: `${vaccine_name} — Yıllık Tekrar`,
              scheduled_at: nextYear.toISOString(),
              status: 'active',
              extra_data: { ...baseExtraData, is_historical: false, source: 'system', approximate_date: true }
            })
          }
        } else if (user_date) {
          // Evet, tarih var
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: vaccine_name,
            scheduled_at: new Date(user_date).toISOString(),
            status: 'completed',
            extra_data: { ...baseExtraData, is_historical: true, source: 'user_input' }
          })

          if (has_annual_booster) {
            const nextYear = new Date(user_date)
            nextYear.setFullYear(nextYear.getFullYear() + 1)
            tasks.push({
              pet_id: id,
              category: mappedCategory,
              sub_type: `${vaccine_name} — Yıllık Tekrar`,
              scheduled_at: nextYear.toISOString(),
              status: 'active',
              extra_data: { ...baseExtraData, is_historical: false, source: 'system' }
            })
          }
        }
      }
      else if (answer === 'no_or_unknown') {
        // Hayır / bilmiyorum: Bugün başla
        const firstDoseDate = new Date()
        let lastDoseDate = new Date(firstDoseDate)
        const dCount = dose_count || 1

        if (dCount === 1) {
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: vaccine_name,
            scheduled_at: firstDoseDate.toISOString(),
            status: 'active',
            extra_data: { ...baseExtraData, auto_generated: true }
          })
        } else if (dCount > 1 && !recurrence_days) {
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: vaccine_name,
            scheduled_at: firstDoseDate.toISOString(),
            status: 'active',
            extra_data: { ...baseExtraData, auto_generated: true, incomplete_schedule: true }
          })
        } else {
          for (let i = 1; i <= dCount; i++) {
            const scheduledDate = new Date(firstDoseDate)
            if (i > 1 && recurrence_days) {
              scheduledDate.setDate(firstDoseDate.getDate() + (i - 1) * recurrence_days)
            }
            lastDoseDate = new Date(scheduledDate)
            tasks.push({
              pet_id: id,
              category: mappedCategory,
              sub_type: vaccine_name,
              scheduled_at: scheduledDate.toISOString(),
              status: 'active',
              extra_data: { ...baseExtraData, auto_generated: true }
            })
          }
        }

        if (has_annual_booster) {
          const boosterDate = new Date(lastDoseDate)
          boosterDate.setFullYear(boosterDate.getFullYear() + 1)
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: `${vaccine_name} — Yıllık Tekrar`,
            scheduled_at: boosterDate.toISOString(),
            status: 'active',
            extra_data: { ...baseExtraData, auto_generated: true }
          })
        }
      }
    }

    // Görevleri plans tablosuna yaz
    if (tasks.length > 0) {
      const { error: insertError } = await supabase.from('plans').insert(tasks)
      if (insertError) throw insertError
    }

    // Petin sağlık geçmişi durumunu güncelle
    const { error: updateError } = await supabase
      .from('pets')
      .update({ health_history_status: 'completed' })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, tasksCreated: tasks.length })

  } catch (error: any) {
    console.error('[health-history] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
