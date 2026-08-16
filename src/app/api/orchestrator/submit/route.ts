import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkFeatureAccess } from '@/lib/features/entitlement/engine'
import { hasPetCapability } from '@/lib/pets/access'

// Request validation schema
const submitRequestSchema = z.object({
  prompt_id: z.string().uuid(),
  payload: z.record(z.string(), z.any()), // The form data submitted by the client
  pet_id: z.string().uuid().optional(),
})

// Specific payload schema for monthly growth
const monthlyGrowthPayloadSchema = z.object({
  _event: z.string().optional(),
  image_url: z.string().url().optional(), // optional if dismissed
  caption: z.string().trim().max(200).optional(),
  taken_at: z.string().datetime().optional(),
})

const GALLERY_BUCKET = 'pet_gallery_bucket'

/**
 * image_url yalnizca projenin kendi storage'ina, dogru bucket'a ve dogru pet
 * klasorune ait olabilir. Baska bucket / baska pet klasoru / harici URL reddedilir.
 */
function isAllowedGalleryUrl(imageUrl: string, petId: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return false
  const expectedPrefix = `${base.replace(/\/$/, '')}/storage/v1/object/public/${GALLERY_BUCKET}/${petId}/`
  return imageUrl.startsWith(expectedPrefix)
}

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

    // Check if dismissed early return
    const eventType = payload._event === 'dismissed' ? 'dismissed' : 'completed'

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

    // 4. Analytics helper.
    // ONEMLI: 'completed' kaydi YALNIZCA mutasyon basariyla tamamlandiktan sonra
    // yazilir. Aksi halde reddedilen (403/400/500) istekler de tamamlanmis sayilir
    // ve kullanici gereksiz yere cooldown'a girer.
    const logEvent = async (
      event_type: 'completed' | 'dismissed' | 'failed_validation',
      event_data: Record<string, unknown>
    ) => {
      const { error: analyticsError } = await supabase
        .from('orchestrator_analytics')
        .insert({
          campaign_id: campaign_id,
          prompt_id: prompt_id,
          profile_id: user.id,
          event_type,
          event_data,
        })

      if (analyticsError) {
        console.error('[Orchestrator Analytics Error]', analyticsError)
        // Analytics hatasi akisi bloklamaz
      }
    }

    /** Dogrulama/yetki hatalarinda: failed_validation logla + hata yanitini dondur. */
    const fail = async (
      reason: string,
      status: number,
      extra: Record<string, unknown> = {}
    ) => {
      await logEvent('failed_validation', { reason, ...extra })
      return NextResponse.json({ error: reason, ...extra }, { status })
    }

    // Early return if dismissed, no mutation needed
    if (eventType === 'dismissed') {
      await logEvent('dismissed', { payload_snapshot: payload })
      return NextResponse.json({ success: true, action: mutation_action, result: 'dismissed' })
    }

    // 5. Route to the correct canonical mutation service
    let result = null

    switch (mutation_action) {
      case 'SAVE_MONTHLY_GROWTH': {
        if (!pet_id) {
          return await fail('pet_id_required', 400)
        }

        // Validate payload
        const growthPayload = monthlyGrowthPayloadSchema.safeParse(payload)
        if (!growthPayload.success) {
          return await fail('invalid_payload', 400)
        }

        const { image_url, caption, taken_at } = growthPayload.data
        if (!image_url) {
          return await fail('image_url_required', 400)
        }

        // Storage whitelist: dogru proje + dogru bucket + dogru pet klasoru
        if (!isAllowedGalleryUrl(image_url, pet_id)) {
          return await fail('invalid_image_url_source', 400)
        }

        // taken_at gelecege tarihlenemez
        const takenAtIso = taken_at || new Date().toISOString()
        if (new Date(takenAtIso).getTime() > Date.now() + 60_000) {
          return await fail('taken_at_in_future', 400)
        }

        // Capability check (IDOR Protection)
        const isPrimaryOwner = await hasPetCapability(supabase, pet_id, 'is_primary_pet_owner')
        if (!isPrimaryOwner) {
          return await fail('forbidden', 403)
        }

        // Quota check via Premium Engine
        let access
        try {
          access = await checkFeatureAccess({ userId: user.id, featureKey: 'gallery_capacity' })
        } catch (quotaErr) {
          console.error('[Mutation Router] Quota check error:', quotaErr)
          return await fail('quota_check_failed', 500)
        }
        
        if (!access.allowed) {
          // Yetim dosya temizligi istemci tarafinda 403 yanitiyla tetiklenir.
          return await fail('gallery_quota_exceeded', 403, { reason: access.reason, upgrade_required: true })
        }

        // Insert into canonical gallery table
        const { error: insertError } = await supabase
          .from('pet_gallery')
          .insert({
            pet_id: pet_id,
            user_id: user.id,
            image_url: image_url,
            caption: caption || 'Aylık Gelişim Fotoğrafı',
            category: 'growth_timeline',
            taken_at: takenAtIso,
          })

        if (insertError) {
          console.error('[Mutation Router] SAVE_MONTHLY_GROWTH insert error:', insertError)
          return await fail('save_failed', 500)
        }

        result = { action: 'SAVE_MONTHLY_GROWTH', success: true }
        break
      }

      case 'SAVE_ADDRESS': {

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
        result = { action: 'SAVE_WEIGHT', success: true }
        break

      case 'SAVE_VACCINE':
        result = { action: 'SAVE_VACCINE', success: true }
        break

      case 'SAVE_FOOD':
        result = { action: 'SAVE_FOOD', success: true }
        break

      case 'UPGRADE_PREMIUM':
        result = { action: 'UPGRADE_PREMIUM', success: true }
        break

      case 'REQUEST_PERMISSION_LOCATION':
        result = { action: 'REQUEST_PERMISSION_LOCATION', success: true }
        break

      default:
        console.warn(`[Mutation Router] Unknown mutation_action: ${mutation_action}`)
        return await fail('unsupported_mutation_action', 400)
    }

    // Mutasyon basarili — 'completed' YALNIZCA burada yazilir.
    await logEvent('completed', { payload_snapshot: payload })

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
