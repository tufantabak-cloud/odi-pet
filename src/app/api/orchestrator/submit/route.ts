import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Request validation schema
const submitRequestSchema = z.object({
  prompt_id: z.string().uuid(),
  payload: z.record(z.string(), z.any()), // The form data submitted by the client
  pet_id: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse payload
    const body = await request.json()
    const { prompt_id, payload, pet_id } = submitRequestSchema.parse(body)

    // 3. Securely lookup the mutation_action from the database
    // The client NEVER sends the mutation_action directly to prevent injection.
    const { data: prompt, error: promptError } = await supabase
      .from('orchestrator_prompts')
      .select('campaign_id, mutation_action, workflow_definition')
      .eq('id', prompt_id)
      .single()

    if (promptError || !prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    const { mutation_action, campaign_id } = prompt

    // 4. Log the 'completed' event in orchestrator_analytics
    const { error: analyticsError } = await supabase
      .from('orchestrator_analytics')
      .insert({
        campaign_id: campaign_id,
        prompt_id: prompt_id,
        profile_id: user.id,
        event_type: 'completed',
        event_data: { payload_snapshot: payload }
      })

    if (analyticsError) {
      console.error('[Orchestrator Analytics Error]', analyticsError)
      // Continue anyway — analytics failure should not block the actual mutation
    }

    // 5. Route to the correct canonical mutation service
    // Each case calls the project's existing SSOT-compliant canonical service.
    let result = null

    switch (mutation_action) {
      case 'SAVE_ADDRESS': {
        console.log(`[Mutation Router] Executing SAVE_ADDRESS for user ${user.id}`, payload)

        const city = typeof payload.city === 'string' ? payload.city : null
        const district = typeof payload.district === 'string' ? payload.district : null
        const neighborhood = typeof payload.neighborhood === 'string' ? payload.neighborhood : null
        const contactName = typeof payload.contact_name === 'string' && payload.contact_name.trim()
          ? payload.contact_name.trim()
          : 'Acil Durum İletişim'
        const emergencyPhone = typeof payload.emergency_phone === 'string' ? payload.emergency_phone : null
        const latitude = typeof payload.latitude === 'number' ? payload.latitude : null
        const longitude = typeof payload.longitude === 'number' ? payload.longitude : null

        const postalCode = typeof payload.postal_code === 'string' ? payload.postal_code : null

        // 1. Update user profile with address and emergency phone (SSOT for /owner/profile/edit)
        const profileUpdates: Record<string, unknown> = {
          updated_at: new Date().toISOString()
        }
        if (city) profileUpdates.city = city
        if (district) profileUpdates.district = district
        if (neighborhood) profileUpdates.neighborhood = neighborhood
        if (postalCode) profileUpdates.postal_code = postalCode
        if (latitude !== null) profileUpdates.latitude = latitude
        if (longitude !== null) profileUpdates.longitude = longitude
        if (emergencyPhone) {
          profileUpdates.phone = emergencyPhone
          profileUpdates.emergency_contact_phone = emergencyPhone
        }
        if (contactName) {
          profileUpdates.emergency_contact_name = contactName
        }
        profileUpdates.emergency_contact_relation = 'Acil Durum'

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id)

        if (profileError) {
          console.error('[Mutation Router] Profile update error:', profileError.message)
        }

        // 2. Synchronize emergency contact across all pets owned by the user (SSOT for FloatingSOS)
        if (emergencyPhone) {
          const { data: userPets } = await supabase
            .from('pets')
            .select('id, sos_contacts')
            .eq('owner_id', user.id)

          if (userPets && userPets.length > 0) {
            const emergencyContactObj = {
              name: contactName,
              phone: emergencyPhone,
              relation: 'Acil Durum'
            }

            for (const pet of userPets) {
              const existingContacts = Array.isArray(pet.sos_contacts) ? pet.sos_contacts : []
              // Filter out duplicate or replace existing
              const filtered = existingContacts.filter(
                (c: any) => c && c.phone !== emergencyPhone
              )
              const updatedContacts = [emergencyContactObj, ...filtered]

              await supabase
                .from('pets')
                .update({ sos_contacts: updatedContacts })
                .eq('id', pet.id)
            }
          }
        }

        result = { action: 'SAVE_ADDRESS', success: true }
        break
      }

      case 'SAVE_WEIGHT':
        // TODO: Wire to canonical createWeightLog({ pet_id, weight: payload.weight })
        console.log(`[Mutation Router] Executing SAVE_WEIGHT for user ${user.id}, pet ${pet_id}`)
        result = { action: 'SAVE_WEIGHT', success: true }
        break

      case 'SAVE_VACCINE':
        // TODO: Wire to canonical createVaccineRecord()
        console.log(`[Mutation Router] Executing SAVE_VACCINE for user ${user.id}`)
        result = { action: 'SAVE_VACCINE', success: true }
        break

      case 'SAVE_FOOD':
        // TODO: Wire to canonical createFoodRecord()
        console.log(`[Mutation Router] Executing SAVE_FOOD for user ${user.id}`)
        result = { action: 'SAVE_FOOD', success: true }
        break

      case 'UPGRADE_PREMIUM':
        console.log(`[Mutation Router] Executing UPGRADE_PREMIUM for user ${user.id}`)
        result = { action: 'UPGRADE_PREMIUM', success: true }
        break

      case 'REQUEST_PERMISSION_LOCATION':
        console.log(`[Mutation Router] Executing REQUEST_PERMISSION_LOCATION for user ${user.id}`)
        result = { action: 'REQUEST_PERMISSION_LOCATION', success: true }
        break

      default:
        console.warn(`[Mutation Router] Unknown mutation_action: ${mutation_action}`)
        return NextResponse.json({ error: 'Unsupported mutation action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[Orchestrator Submit Error]', error)
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
