import { describe, it, expect } from 'vitest'
import { lostReportPublishPayloadSchema } from '../validation'

describe('Social Module Core Gaps Validation Tests', () => {
  it('validates lost report payload with additional photos, distinctive features, collar info and color', () => {
    const validPayload = {
      petId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      contactPhone: '05554443322',
      location: {
        isManual: false,
        lat: 41.0082,
        lng: 28.9784,
        address: 'Kadıköy, Moda Sahili',
      },
      photo: {
        photoUrl: 'https://storage.odi.pet/photo1.jpg',
      },
      additionalPhotos: [
        'https://storage.odi.pet/photo2.jpg',
        'https://storage.odi.pet/photo3.jpg',
      ],
      distinctiveFeatures: 'Sağ kulağında çentik var, göğsü beyaz lekeli',
      collarInfo: 'Kırmızı boyun tasması ve zil',
      color: 'Siyah - Beyaz',
      lastSeenAt: new Date().toISOString(),
    }

    const result = lostReportPublishPayloadSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.distinctiveFeatures).toBe('Sağ kulağında çentik var, göğsü beyaz lekeli')
      expect(result.data.collarInfo).toBe('Kırmızı boyun tasması ve zil')
      expect(result.data.color).toBe('Siyah - Beyaz')
      expect(result.data.additionalPhotos).toHaveLength(2)
    }
  })

  it('rejects additionalPhotos if array exceeds limit of 5', () => {
    const tooManyPhotos = {
      petId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      contactPhone: '05554443322',
      location: {
        isManual: true,
        address: 'Beşiktaş Meydanı',
      },
      additionalPhotos: [
        'url1', 'url2', 'url3', 'url4', 'url5', 'url6'
      ],
    }

    const result = lostReportPublishPayloadSchema.safeParse(tooManyPhotos)
    expect(result.success).toBe(false)
  })

  it('accepts minimal payload without optional distinctive fields', () => {
    const minimalPayload = {
      petId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      contactPhone: '05554443322',
      location: {
        isManual: true,
        address: 'İzmir Alsancak Kordon',
      },
    }

    const result = lostReportPublishPayloadSchema.safeParse(minimalPayload)
    expect(result.success).toBe(true)
  })
})
