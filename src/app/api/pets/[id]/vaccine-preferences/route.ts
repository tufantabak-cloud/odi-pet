import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { normalizeSpecies } from '@/lib/species'

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, petId: string, userId: string) {
  const { data } = await supabase
    .from('pet_owners')
    .select('pet_id')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .maybeSingle()
  return !!data
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: petId } = await props.params
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    const isOwner = await verifyOwnership(supabase, petId, user.id)
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, name, species')
      .eq('id', petId)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Evcil hayvan bulunamadı' }, { status: 404 })
    }

    const petSpecies = normalizeSpecies(pet.species)

    const { data: protocols, error: protocolsError } = await supabase
      .from('vaccine_protocols')
      .select('*')
      .eq('species', petSpecies)
      .eq('is_active', true)
      .eq('is_core', false)
      .in('category', ['risk_based', 'optional'])
      .order('sort_order', { ascending: true })

    if (protocolsError) {
      return NextResponse.json({ error: protocolsError.message }, { status: 500 })
    }

    const { data: preferences, error: prefError } = await supabase
      .from('pet_vaccine_preferences')
      .select('*')
      .eq('pet_id', petId)

    if (prefError) {
      return NextResponse.json({ error: prefError.message }, { status: 500 })
    }

    const codes = (protocols ?? []).map(p => p.vaccine_code)
    const activePlansByCode: Record<string, boolean> = {}

    if (codes.length > 0) {
      const { data: activePlans } = await supabase
        .from('plans')
        .select('extra_data')
        .eq('pet_id', petId)
        .eq('category', 'asi')
        .eq('status', 'active')

      for (const plan of activePlans ?? []) {
        const code = (plan as any).extra_data?.vaccine?.code ?? (plan as any).extra_data?.vaccine_code
        if (code && codes.includes(code)) {
          activePlansByCode[code] = true
        }
      }
    }

    return NextResponse.json({
      pet,
      protocols: protocols ?? [],
      preferences: preferences ?? [],
      activePlansByCode,
    })
  } catch (error: unknown) {
    console.error('vaccine-preferences GET error:', error)
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: petId } = await props.params
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    const isOwner = await verifyOwnership(supabase, petId, user.id)
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { vaccine_code, enabled, vet_recommended, risk_reason } = body

    if (!vaccine_code || typeof vaccine_code !== 'string') {
      return NextResponse.json({ error: 'vaccine_code zorunludur' }, { status: 400 })
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled boolean olmalıdır' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('pet_vaccine_preferences')
      .select('id, enabled, enabled_at, disabled_at')
      .eq('pet_id', petId)
      .eq('vaccine_code', vaccine_code)
      .maybeSingle()

    const now = new Date().toISOString()
    const enabledAt = enabled ? now : (existing?.enabled_at ?? null)
    const disabledAt = !enabled ? now : (existing?.disabled_at ?? null)

    const { data: record, error } = await supabase
      .from('pet_vaccine_preferences')
      .upsert(
        {
          pet_id: petId,
          vaccine_code,
          enabled,
          vet_recommended: !!vet_recommended,
          risk_reason: risk_reason || null,
          enabled_at: enabledAt,
          disabled_at: disabledAt,
          created_by: existing ? undefined : user.id,
          updated_at: now,
        },
        { onConflict: 'pet_id,vaccine_code' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: record })
  } catch (error: unknown) {
    console.error('vaccine-preferences PATCH error:', error)
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }, { status: 500 })
  }
}
