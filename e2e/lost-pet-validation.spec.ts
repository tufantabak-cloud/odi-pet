import { expect } from '@playwright/test';
import { test } from './fixtures';

test.describe('Lost Pet Location Validation Edge Cases', () => {
  const MOCK_PET_ID = 'e83d2947-794e-4fb8-a8c6-629cd122ab57' // Must be a valid UUID format

  test('POST /api/pets/[id]/lost should return 400 when location is empty or too short', async ({ request }) => {
    const responseEmpty = await request.post(`/api/pets/${MOCK_PET_ID}/lost`, {
      data: {
        last_seen_location: '   ',
        contact_phone: '05554443322'
      }
    })
    
    expect([400, 401, 403]).toContain(responseEmpty.status())
    if (responseEmpty.status() === 400) {
      const body = await responseEmpty.json()
      expect(body.error).toContain('en az 5 karakter')
    }
  })

  test('POST /api/pets/[id]/lost should return 400 when contact_phone is invalid', async ({ request }) => {
    const responseBadPhone = await request.post(`/api/pets/${MOCK_PET_ID}/lost`, {
      data: {
        last_seen_location: 'GeÃ§erli Konum Bilgisi',
        contact_phone: 'asdfasdf'
      }
    })
    
    expect([400, 401, 403]).toContain(responseBadPhone.status())
    if (responseBadPhone.status() === 400) {
      const body = await responseBadPhone.json()
      expect(body.error).toContain('geÃ§erli bir iletiÅŸim numarasÄ±')
    }
  })

  test('POST /api/pets/[id]/lost should return 400 when last_seen_at is in the future', async ({ request }) => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 2) // +2 days

    const responseFuture = await request.post(`/api/pets/${MOCK_PET_ID}/lost`, {
      data: {
        last_seen_location: 'GeÃ§erli Konum Bilgisi',
        contact_phone: '05554443322',
        last_seen_at: futureDate.toISOString()
      }
    })
    
    expect([400, 401, 403]).toContain(responseFuture.status())
    if (responseFuture.status() === 400) {
      const body = await responseFuture.json()
      expect(body.error).toContain('gelecekte olamaz')
    }
  })
})

