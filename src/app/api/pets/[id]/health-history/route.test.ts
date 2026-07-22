import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

// Load environment variables
dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { POST } from './route'

const adminClient = createAdminSupabaseClient()

// Mock auth helper — route getCurrentProfile() kullanıyor
vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return {
    ...actual,
    getCurrentProfile: vi.fn(),
  }
})

// Mock Supabase server client -> gerçek admin client
vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual<typeof serverSupabaseModule>('@/lib/supabase/server')
  return {
    ...actual,
    createServerSupabaseClient: () => adminClient,
  }
})

/**
 * P0.5 — Sağlık Geçmişi Aşı Tür Bariyeri entegrasyon testleri.
 *
 * Bariyer, /api/pets/[id]/health-history POST'unda, plans insert'inden ÖNCE
 * pet türüyle uyumsuz veya bilinmeyen aşı kodlarını reddeder (all-or-nothing).
 *
 * Reddetme senaryoları HİÇBİR yazma yapmaz (yan etkisiz). Yalnızca tür-uyumlu
 * kabul senaryosu plans/pets yazar; afterAll'da hedefli temizlenir ve pet'in
 * health_history_status değeri geri yüklenir.
 */
describe('P0.5 Health-History Aşı Tür Bariyeri', () => {
  const testUserId = '4f1256db-2a84-434d-852c-bdba22e538ca' // tufan.tabak@gmail.com

  let petId: string
  let petSpecies: 'cat' | 'dog'
  let oppositeSpecies: 'cat' | 'dog'
  let originalHealthStatus: string | null = null

  const MATCH = 'HH_TEST_MATCH'
  const MISMATCH_A = 'HH_TEST_MISMATCH_A'
  const MISMATCH_B = 'HH_TEST_MISMATCH_B'
  const UNKNOWN = 'HH_TEST_UNKNOWN_ZZZ'
  const testCodes = [MATCH, MISMATCH_A, MISMATCH_B]

  const mockProfile = (profile: any) =>
    vi.spyOn(authModule, 'getCurrentProfile').mockResolvedValue(profile)

  const postReq = (id: string, vaccine_answers: any[]) =>
    new NextRequest(`http://localhost/api/pets/${id}/health-history`, {
      method: 'POST',
      body: JSON.stringify({ vaccine_answers }),
    })

  // answer 'no_or_unknown' + dose_count 1 => tek 'active' plan üretir
  const vItem = (code: string, extra: any = {}) => ({
    vaccine_code: code,
    vaccine_name: code,
    answer: 'no_or_unknown',
    dose_count: 1,
    ...extra,
  })

  const planCount = async (id: string): Promise<number> => {
    const { count } = await adminClient
      .from('plans')
      .select('*', { count: 'exact', head: true })
      .eq('pet_id', id)
    return count ?? 0
  }

  const healthStatus = async (id: string): Promise<string | null> => {
    const { data } = await adminClient.from('pets').select('health_history_status').eq('id', id).single()
    return (data as any)?.health_history_status ?? null
  }

  beforeAll(async () => {
    // Test kullanıcısının bir petini + türünü bul
    const { data: ownerRow } = await adminClient
      .from('pet_owners')
      .select('pet_id, pets(species, health_history_status)')
      .eq('profile_id', testUserId)
      .limit(1)
      .single()

    if (!ownerRow) throw new Error('Test kullanıcısına ait pet bulunamadı.')

    petId = (ownerRow as any).pet_id
    petSpecies = (ownerRow as any).pets?.species === 'dog' ? 'dog' : 'cat'
    oppositeSpecies = petSpecies === 'dog' ? 'cat' : 'dog'
    originalHealthStatus = (ownerRow as any).pets?.health_history_status ?? null

    // Önceki koşulardan kalan test protokollerini temizle
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', testCodes)

    // Tür-uyumlu protokol
    await adminClient.from('vaccine_protocols').insert({
      vaccine_code: MATCH,
      protocol_name: 'HH Test Match',
      species: petSpecies,
      category: 'optional',
      is_active: true,
      is_core: false,
      doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
    })

    // Tür-uyumsuz protokoller (petin karşı türü)
    for (const code of [MISMATCH_A, MISMATCH_B]) {
      await adminClient.from('vaccine_protocols').insert({
        vaccine_code: code,
        protocol_name: `HH Test Mismatch ${code}`,
        species: oppositeSpecies,
        category: 'optional',
        is_active: true,
        is_core: false,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
      })
    }
  })

  afterAll(async () => {
    if (petId) {
      // Kabul senaryosunda üretilen test planlarını hedefli sil
      await adminClient.from('plans').delete().eq('pet_id', petId).eq('extra_data->vaccine->>code', MATCH)
      // Pet durumunu geri yükle
      await adminClient.from('pets').update({ health_history_status: originalHealthStatus }).eq('id', petId)
    }
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', testCodes)
  })

  it('0. Oturumsuz -> 401', async () => {
    mockProfile(null)
    const res = await POST(postReq(petId, [vItem(MATCH)]), { params: Promise.resolve({ id: petId }) })
    expect(res.status).toBe(401)
  })

  it('2/5. Tür uyumsuz tek aşı -> 400 VACCINE_SPECIES_MISMATCH, hiç yazma yok', async () => {
    mockProfile({ id: testUserId, role: 'admin' })
    const before = await planCount(petId)
    const res = await POST(postReq(petId, [vItem(MISMATCH_A)]), { params: Promise.resolve({ id: petId }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VACCINE_SPECIES_MISMATCH')
    expect(json.details.pet_species).toBe(petSpecies)
    expect(json.details.mismatches).toEqual([{ vaccine_code: MISMATCH_A, protocol_species: oppositeSpecies }])
    expect(await planCount(petId)).toBe(before)
  })

  it('6. Bilinmeyen kod -> 400 VACCINE_PROTOCOL_NOT_FOUND, hiç yazma yok', async () => {
    mockProfile({ id: testUserId, role: 'admin' })
    const before = await planCount(petId)
    const res = await POST(postReq(petId, [vItem(UNKNOWN)]), { params: Promise.resolve({ id: petId }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VACCINE_PROTOCOL_NOT_FOUND')
    expect(json.details.unknown_vaccine_codes).toContain(UNKNOWN)
    expect(await planCount(petId)).toBe(before)
  })

  it('7. Aynı istekte iki farklı uyumsuz kod -> her ikisi mismatches içinde toplanır', async () => {
    mockProfile({ id: testUserId, role: 'admin' })
    const before = await planCount(petId)
    const res = await POST(postReq(petId, [vItem(MISMATCH_A), vItem(MISMATCH_B)]), {
      params: Promise.resolve({ id: petId }),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VACCINE_SPECIES_MISMATCH')
    const codes = json.details.mismatches.map((m: any) => m.vaccine_code)
    expect(codes).toEqual(expect.arrayContaining([MISMATCH_A, MISMATCH_B]))
    expect(json.details.mismatches).toHaveLength(2)
    expect(await planCount(petId)).toBe(before)
  })

  it('8. Karma: bilinmeyen + uyumsuz -> tek yanıtta İKİ liste de eksiksiz, hiç yazma yok', async () => {
    mockProfile({ id: testUserId, role: 'admin' })
    const before = await planCount(petId)
    const res = await POST(postReq(petId, [vItem(UNKNOWN), vItem(MISMATCH_A)]), {
      params: Promise.resolve({ id: petId }),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    // Ana kod NOT_FOUND, ama mismatches yanıtta KAYBOLMAZ.
    expect(json.error).toBe('VACCINE_PROTOCOL_NOT_FOUND')
    expect(json.details.pet_species).toBe(petSpecies)
    expect(json.details.unknown_vaccine_codes).toContain(UNKNOWN)
    expect(json.details.mismatches).toEqual([{ vaccine_code: MISMATCH_A, protocol_species: oppositeSpecies }])
    expect(await planCount(petId)).toBe(before)
  })

  it('11. Kodsuz aşı girdisi -> 400, missing_vaccine_code_indices, hiç yazma yok, durum değişmez', async () => {
    mockProfile({ id: testUserId, role: 'admin' })
    const beforeCount = await planCount(petId)
    const beforeStatus = await healthStatus(petId)
    // index 0: parasite OLMAYAN, vaccine_code taşımayan girdi (serbest metin)
    const res = await POST(
      postReq(petId, [{ vaccine_name: 'Serbest metin asi', answer: 'no_or_unknown', dose_count: 1 }]),
      { params: Promise.resolve({ id: petId }) }
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VACCINE_PROTOCOL_NOT_FOUND')
    expect(json.details.missing_vaccine_code_indices).toContain(0)
    expect(await planCount(petId)).toBe(beforeCount)
    expect(await healthStatus(petId)).toBe(beforeStatus)
  })

  it('9. Toplu istekte tek uyumsuz -> SIFIR plan yazılır ve pet durumu değişmez', async () => {
    mockProfile({ id: testUserId, role: 'admin' })
    const beforeCount = await planCount(petId)
    const beforeStatus = await healthStatus(petId)
    // [uyumlu MATCH, uyumsuz MISMATCH_A] -> tümü reddedilmeli
    const res = await POST(postReq(petId, [vItem(MATCH), vItem(MISMATCH_A)]), {
      params: Promise.resolve({ id: petId }),
    })
    expect(res.status).toBe(400)
    expect(await planCount(petId)).toBe(beforeCount)
    expect(await healthStatus(petId)).toBe(beforeStatus)
  })

  it('10. category:parasite girdisi bariyerden atlanır (aşı bariyeri kapsam dışı)', async () => {
    mockProfile({ id: testUserId, role: 'admin' })
    // Karşı türe ait kodu parasite olarak etiketle: aşı bariyeri bunu DEĞERLENDİRMEZ
    // (species mismatch DÖNMEZ). Parazit doğrulaması ayrı takip görevidir.
    const res = await POST(postReq(petId, [{ vaccine_code: MISMATCH_A, category: 'parasite', recurrence_days: 30 }]), {
      params: Promise.resolve({ id: petId }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    // Üretilen parazit planlarını temizle (bu test kodu için)
    await adminClient.from('plans').delete().eq('pet_id', petId).eq('extra_data->vaccine->>code', MISMATCH_A)
    await adminClient.from('pets').update({ health_history_status: originalHealthStatus }).eq('id', petId)
  })

  it('1/3. Tür uyumlu aşı -> 200, plan yazılır (normal akış bozulmaz)', async () => {
    mockProfile({ id: testUserId, role: 'admin' })
    const before = await planCount(petId)
    const res = await POST(postReq(petId, [vItem(MATCH)]), { params: Promise.resolve({ id: petId }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.tasksCreated).toBeGreaterThan(0)
    expect(await planCount(petId)).toBeGreaterThan(before)
  })
})
