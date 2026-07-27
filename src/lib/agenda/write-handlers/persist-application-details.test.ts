import { describe, expect, it, vi } from 'vitest'
import { persistApplicationDetails } from './persist-application-details'

function createSupabaseMock(updateErrors: Array<unknown> = []) {
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() =>
        Promise.resolve({ error: updateErrors.shift() ?? null })
      ),
    })),
  }))
  const insert = vi.fn(() => Promise.resolve({ error: null }))
  const maybeSingle = vi.fn(() =>
    Promise.resolve({ data: null, error: null })
  )
  const select = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle })),
    })),
  }))
  const from = vi.fn((table: string) =>
    table === 'payments' ? { select, insert } : { update }
  )

  return { client: { from }, from, update, insert }
}

describe('persistApplicationDetails', () => {
  it('aşı ayrıntılarını ve tutarı mevcut şemayla uyumlu kaydeder', async () => {
    const mock = createSupabaseMock()

    const result = await persistApplicationDetails({
      category: 'asi',
      rawDetails: {
        brand: 'Nobivac',
        lot_number: 'LOT-42',
        administration_place: 'veterinary_clinic',
        amount: 1250,
        currency: 'TRY',
      },
      recordId: 'record-1',
      petId: 'pet-1',
      userId: 'user-1',
      supabase: mock.client as never,
    })

    expect(result.brand).toBe('Nobivac')
    expect(mock.from).toHaveBeenCalledWith('vaccine_records_v2')
    expect(mock.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        brand_free_text: 'Nobivac',
        lot_number: 'LOT-42',
      })
    )
    expect(mock.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        administration_place: 'veterinary_clinic',
        amount: 1250,
      })
    )
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        record_id: 'record-1',
        payment_type: 'vaccine',
        amount: 1250,
      })
    )
  })

  it('yeni sütunlar henüz yoksa temel aşı bilgisini kaydedip devam eder', async () => {
    const mock = createSupabaseMock([
      null,
      { code: 'PGRST204', message: "Could not find the 'amount' column" },
    ])

    await expect(
      persistApplicationDetails({
        category: 'asi',
        rawDetails: {
          brand: 'Nobivac',
          administration_place: 'home',
        },
        recordId: 'record-1',
        petId: 'pet-1',
        userId: 'user-1',
        supabase: mock.client as never,
      })
    ).resolves.toMatchObject({ brand: 'Nobivac' })
  })

  it('başka kullanıcıya ait belge yolunu reddeder', async () => {
    const mock = createSupabaseMock()

    await expect(
      persistApplicationDetails({
        category: 'parazit',
        rawDetails: {
          document_storage_path: 'other-user/pet-1/file.jpg',
        },
        recordId: 'record-1',
        petId: 'pet-1',
        userId: 'user-1',
        supabase: mock.client as never,
      })
    ).rejects.toThrow('INVALID_DOCUMENT_STORAGE_PATH')
  })
})
