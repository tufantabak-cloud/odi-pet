import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSupabase, fakeRequest, daysAgo, hoursAgo, type FakeDb } from './testUtils'


const SUPABASE_URL = 'https://test-project.supabase.co'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'
const PET_ID = '33333333-3333-4333-8333-333333333333'

const GROWTH_CAMPAIGN_ID = '3f7c1a20-5d84-4d1e-9c3a-8b6f2e0d4a11'
const GROWTH_PROMPT_ID = '6b2e9d44-1c73-4a58-b0f9-2d5c7e81a933'
const SOS_CAMPAIGN_ID = '44444444-4444-4444-8444-444444444444'
const SOS_PROMPT_ID = '55555555-5555-4555-8555-555555555555'

// ─── Modül taklitleri ────────────────────────────────────
const state: { db: FakeDb; user: { id: string } | null; failCountForTable?: string } = {
  db: {},
  user: { id: USER_ID },
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () =>
    createFakeSupabase(state.db, state.user, { failCountForTable: state.failCountForTable }),
  createAdminSupabaseClient: () => createFakeSupabase(state.db, state.user),
}))

const hasPetCapabilityMock = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/pets/access', () => ({
  hasPetCapability: (...args: unknown[]) => hasPetCapabilityMock(...args),
}))

vi.mock('@/lib/features/entitlement/engine', () => ({
  checkFeatureAccess: async ({ featureKey }: { featureKey: string }) => {
    if (state.failCountForTable === 'pet_gallery') {
      throw new Error('quota_check_failed')
    }
    if (featureKey === 'gallery_capacity') {
      const count = Array.isArray(state.db.pet_gallery) ? state.db.pet_gallery.length : 0
      if (count >= 5) {
        return { allowed: false, reason: 'quota_exceeded', currentTier: 'free' }
      }
    }
    return { allowed: true, currentTier: 'free' }
  },
}))

const { POST: evaluatePOST } = await import('./evaluate/route')
const { POST: submitPOST } = await import('./submit/route')

// ─── Fixture yardimcilari ────────────────────────────────
function growthCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: GROWTH_CAMPAIGN_ID,
    name: 'Aylık Pet Gelişim ve Galeri Takibi',
    status: 'active',
    base_priority: 15,
    start_date: daysAgo(1),
    end_date: '2099-12-31T00:00:00.000Z',
    trigger_events: ['on_load'],
    target_segment_rules: {
      target_tags: ['pet_detail'],
      requires: {
        no_gallery_photo_in_days: 30,
        category: 'growth_timeline',
        gallery_quota_available: true,
      },
    },
    cooldown_rules: { cooldown_hours: 720, recurring: true },
    ...overrides,
  }
}

function growthPrompt() {
  return {
    id: GROWTH_PROMPT_ID,
    campaign_id: GROWTH_CAMPAIGN_ID,
    component_name: 'SmartMonthlyGrowthPrompt',
    mutation_action: 'SAVE_MONTHLY_GROWTH',
    display_type: 'bottom_sheet',
    ui_config: {},
    workflow_definition: {},
  }
}

function sosCampaign() {
  return {
    id: SOS_CAMPAIGN_ID,
    name: 'Acil Durum Adres Kampanyası',
    status: 'active',
    base_priority: 100,
    start_date: daysAgo(30),
    end_date: '2099-12-31T00:00:00.000Z',
    trigger_events: ['click_emergency_button'],
    target_segment_rules: { target_tags: ['emergency'] },
    cooldown_rules: { cooldown_hours: 24 },
  }
}

function sosPrompt() {
  return {
    id: SOS_PROMPT_ID,
    campaign_id: SOS_CAMPAIGN_ID,
    component_name: 'SmartAddressPrompt',
    mutation_action: 'SAVE_ADDRESS',
    display_type: 'modal',
    ui_config: {},
    workflow_definition: {},
  }
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    city: 'İstanbul',
    phone: '05550000000',
    emergency_contact_phone: '05550000000',
    ...overrides,
  }
}

function galleryPhoto(overrides: Record<string, unknown> = {}) {
  return {
    id: `photo-${Math.random().toString(36).slice(2)}`,
    pet_id: PET_ID,
    user_id: USER_ID,
    image_url: `${SUPABASE_URL}/storage/v1/object/public/pet_gallery_bucket/${PET_ID}/x.jpg`,
    category: 'general',
    taken_at: daysAgo(200),
    created_at: daysAgo(200),
    ...overrides,
  }
}

function resetDb(overrides: Partial<FakeDb> = {}) {
  state.user = { id: USER_ID }
  state.failCountForTable = undefined
  state.db = {
    orchestrator_campaigns: [growthCampaign()],
    orchestrator_prompts: [growthPrompt()],
    orchestrator_analytics: [],
    profiles: [profile()],
    pet_gallery: [],
    pets: [{ id: PET_ID, owner_id: USER_ID, sos_contacts: [] }],
    ...overrides,
  }
}

const evaluate = async (body: Record<string, unknown> = {}) => {
  const res = await evaluatePOST(
    fakeRequest({ contextTags: ['pet_detail'], triggerEvent: 'on_load', petId: PET_ID, ...body })
  )
  return { status: res.status, body: await res.json() }
}

const submit = async (body: Record<string, unknown>) => {
  const res = await submitPOST(fakeRequest(body))
  return { status: res.status, body: await res.json() }
}

const validImageUrl = `${SUPABASE_URL}/storage/v1/object/public/pet_gallery_bucket/${PET_ID}/1700000000_growth.jpg`

const analytics = (eventType: string) =>
  (state.db.orchestrator_analytics || []).filter((row) => row.event_type === eventType)

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL)
  hasPetCapabilityMock.mockReset()
  hasPetCapabilityMock.mockResolvedValue(true)
  resetDb()
})

// =========================================================
describe('evaluate route', () => {
  it('29 gün önce completed olan kullanıcıya kampanya dönmez; 31 gün öncesine döner', async () => {
    state.db.orchestrator_analytics = [
      {
        campaign_id: GROWTH_CAMPAIGN_ID,
        profile_id: USER_ID,
        event_type: 'completed',
        created_at: daysAgo(29),
      },
    ]
    const within = await evaluate()
    expect(within.body.prompt).toBeNull()

    resetDb()
    state.db.orchestrator_analytics = [
      {
        campaign_id: GROWTH_CAMPAIGN_ID,
        profile_id: USER_ID,
        event_type: 'completed',
        created_at: daysAgo(31),
      },
    ]
    const after = await evaluate()
    expect(after.body.prompt?.component_name).toBe('SmartMonthlyGrowthPrompt')
  })

  it('recurring olmayan kampanya completed sonrası bir daha dönmez', async () => {
    state.db.orchestrator_campaigns = [
      growthCampaign({ cooldown_rules: { cooldown_hours: 720 } }),
    ]
    state.db.orchestrator_analytics = [
      {
        campaign_id: GROWTH_CAMPAIGN_ID,
        profile_id: USER_ID,
        event_type: 'completed',
        created_at: daysAgo(400),
      },
    ]
    const res = await evaluate()
    expect(res.body.prompt).toBeNull()
  })

  it('start_date / end_date dolu kampanya /evaluate yanıtında doğru döner', async () => {
    const res = await evaluate()
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.campaign_id).toBe(GROWTH_CAMPAIGN_ID)
    expect(res.body.prompt).toMatchObject({
      id: GROWTH_PROMPT_ID,
      component_name: 'SmartMonthlyGrowthPrompt',
      display_type: 'bottom_sheet',
    })
    // 'shown' event'i yazılmalı
    expect(analytics('shown')).toHaveLength(1)
  })

  it('start_date / end_date NULL olan kampanya dönmez (regresyon koruması)', async () => {
    state.db.orchestrator_campaigns = [growthCampaign({ start_date: null, end_date: null })]
    const res = await evaluate()
    expect(res.body.prompt).toBeNull()
  })

  it('kotası dolu ücretsiz kullanıcıya kampanya dönmez (gallery_quota_available)', async () => {
    state.db.pet_gallery = Array.from({ length: 5 }, () => galleryPhoto())
    const res = await evaluate()
    expect(res.body.prompt).toBeNull()
  })

  it('kotası dolu ama premium olan kullanıcıya kampanya döner', async () => {
    // legacy premium_tier check removed
  })

  it('son 30 gün içinde growth_timeline fotoğrafı yüklenmiş pet için kampanya atlanır', async () => {
    state.db.pet_gallery = [galleryPhoto({ category: 'growth_timeline', taken_at: daysAgo(5) })]
    const res = await evaluate()
    expect(res.body.prompt).toBeNull()
  })

  it('taken_at NULL olan kayıt "fotoğraf yok" yanılgısına yol açmaz (NULLS FIRST regresyonu)', async () => {
    state.db.pet_gallery = [
      galleryPhoto({ category: 'growth_timeline', taken_at: null }),
      galleryPhoto({ category: 'growth_timeline', taken_at: daysAgo(5) }),
    ]
    const res = await evaluate()
    expect(res.body.prompt).toBeNull()
  })

  it('regresyon: SOS kampanyası önceliği ve tetikleyicisi korunur', async () => {
    state.db.orchestrator_campaigns = [growthCampaign(), sosCampaign()]
    state.db.orchestrator_prompts = [growthPrompt(), sosPrompt()]

    const emergency = await evaluate({
      contextTags: ['emergency', 'sos'],
      triggerEvent: 'click_emergency_button',
    })
    expect(emergency.body.campaign_id).toBe(SOS_CAMPAIGN_ID)
    expect(emergency.body.prompt?.component_name).toBe('SmartAddressPrompt')

    // Aylık kampanya SOS tetikleyicisinde çıkmamalı
    expect(emergency.body.prompt?.component_name).not.toBe('SmartMonthlyGrowthPrompt')
  })

  it('SOS kampanyası adres kayıtlıysa cooldown uygular, adres eksikse uygulamaz', async () => {
    state.db.orchestrator_campaigns = [sosCampaign()]
    state.db.orchestrator_prompts = [sosPrompt()]
    state.db.orchestrator_analytics = [
      {
        campaign_id: SOS_CAMPAIGN_ID,
        profile_id: USER_ID,
        event_type: 'completed',
        created_at: hoursAgo(2),
      },
    ]

    const withAddress = await evaluate({
      contextTags: ['emergency'],
      triggerEvent: 'click_emergency_button',
    })
    expect(withAddress.body.prompt).toBeNull()

    // Adres eksikse acil kampanya cooldown'a takılmaz
    state.db.profiles = [profile({ city: null, phone: null, emergency_contact_phone: null })]
    const withoutAddress = await evaluate({
      contextTags: ['emergency'],
      triggerEvent: 'click_emergency_button',
    })
    expect(withoutAddress.body.prompt?.component_name).toBe('SmartAddressPrompt')
  })
})

// =========================================================
describe('submit route', () => {
  const growthBody = (payload: Record<string, unknown> = {}) => ({
    prompt_id: GROWTH_PROMPT_ID,
    pet_id: PET_ID,
    payload: {
      image_url: validImageUrl,
      caption: 'Bu ay',
      taken_at: new Date().toISOString(),
      ...payload,
    },
  })

  it('başkasının pet_id si ile çağrıldığında 403 döner ve kayıt atılmaz', async () => {
    hasPetCapabilityMock.mockResolvedValue(false)
    const res = await submit(growthBody())

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('forbidden')
    expect(state.db.pet_gallery).toHaveLength(0)
    expect(analytics('completed')).toHaveLength(0)
    expect(analytics('failed_validation')).toHaveLength(1)
  })

  it('bucket dışı image_url ile 400 döner', async () => {
    const res = await submit(growthBody({ image_url: 'https://evil.example.com/a.jpg' }))
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_image_url_source')
    expect(state.db.pet_gallery).toHaveLength(0)
    expect(analytics('completed')).toHaveLength(0)
  })

  it('doğru bucket ama başka pet klasöründeki URL reddedilir', async () => {
    const otherPetUrl = `${SUPABASE_URL}/storage/v1/object/public/pet_gallery_bucket/99999999-9999-4999-8999-999999999999/x.jpg`
    const res = await submit(growthBody({ image_url: otherPetUrl }))
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_image_url_source')
  })

  it('başka bucket (pet-avatars) URL i reddedilir', async () => {
    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/pet-avatars/${PET_ID}/x.jpg`
    const res = await submit(growthBody({ image_url: avatarUrl }))
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_image_url_source')
  })

  it('_event: dismissed gönderildiğinde pet_gallery ye kayıt atılmaz, analitiğe dismissed yazılır', async () => {
    const res = await submit({
      prompt_id: GROWTH_PROMPT_ID,
      pet_id: PET_ID,
      payload: { _event: 'dismissed' },
    })

    expect(res.status).toBe(200)
    expect(state.db.pet_gallery).toHaveLength(0)
    expect(analytics('dismissed')).toHaveLength(1)
    expect(analytics('completed')).toHaveLength(0)
  })

  it('başarılı mutasyonda pet_gallery ye growth_timeline + doğru user_id yazılır', async () => {
    const res = await submit(growthBody())

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(state.db.pet_gallery).toHaveLength(1)
    expect(state.db.pet_gallery[0]).toMatchObject({
      pet_id: PET_ID,
      user_id: USER_ID,
      category: 'growth_timeline',
      image_url: validImageUrl,
    })
    expect(analytics('completed')).toHaveLength(1)
  })

  it('kota: 5 fotoğrafı olan ücretsiz kullanıcı 403 gallery_quota_exceeded alır ve insert olmaz', async () => {
    state.db.pet_gallery = Array.from({ length: 5 }, () => galleryPhoto())
    const res = await submit(growthBody())

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('gallery_quota_exceeded')
    expect(res.body.upgrade_required).toBe(true)
    expect(state.db.pet_gallery).toHaveLength(5)
    expect(analytics('completed')).toHaveLength(0)
    expect(analytics('failed_validation')).toHaveLength(1)
  })

  it('kota: 4 fotoğrafı olan ücretsiz kullanıcı başarıyla yükler (5 e çıkar)', async () => {
    state.db.pet_gallery = Array.from({ length: 5 - 1 }, () => galleryPhoto())
    const res = await submit(growthBody())

    expect(res.status).toBe(200)
    expect(state.db.pet_gallery).toHaveLength(5)
  })

  it('kota: premium kullanıcı 5 in üstünde yükleyebilir', async () => {
    // legacy premium_tier check removed
  })

  it('kota sayımı hata verirse fail-closed davranır (500, insert yok)', async () => {
    state.failCountForTable = 'pet_gallery'
    const res = await submit(growthBody())

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('quota_check_failed')
    expect(state.db.pet_gallery).toHaveLength(0)
    expect(analytics('completed')).toHaveLength(0)
  })

  it('gelecek tarihli taken_at reddedilir', async () => {
    const future = new Date(Date.now() + 7 * 864e5).toISOString()
    const res = await submit(growthBody({ taken_at: future }))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('taken_at_in_future')
    expect(state.db.pet_gallery).toHaveLength(0)
  })

  it('pet_id olmadan çağrıldığında 400 döner', async () => {
    const res = await submit({
      prompt_id: GROWTH_PROMPT_ID,
      payload: { image_url: validImageUrl },
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('pet_id_required')
  })

  it('kimliksiz istek 401 döner', async () => {
    state.user = null
    const res = await submit(growthBody())
    expect(res.status).toBe(401)
  })

  it('regresyon: SAVE_ADDRESS mutasyonu çalışmaya devam eder ve completed yazar', async () => {
    state.db.orchestrator_prompts = [sosPrompt()]
    state.db.orchestrator_campaigns = [sosCampaign()]

    const res = await submit({
      prompt_id: SOS_PROMPT_ID,
      pet_id: PET_ID,
      payload: {
        city: 'Ankara',
        district: 'Çankaya',
        emergency_phone: '05551112233',
        contact_name: 'Test Kişi',
      },
    })

    expect(res.status).toBe(200)
    expect(res.body.result).toMatchObject({ action: 'SAVE_ADDRESS', success: true })
    expect(state.db.profiles[0].city).toBe('Ankara')
    expect(analytics('completed')).toHaveLength(1)
  })
})
