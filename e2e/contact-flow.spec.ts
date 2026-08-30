import { test, expect } from '@playwright/test'

test.describe('Public Contact & Support Form API Flow', () => {
  test('should successfully accept valid contact form submission', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: 'Odi Test User',
        email: 'testuser@example.com',
        subject: 'Genel Bilgi Talebi',
        message: 'Merhaba Odi.Pet ekibi, uygulamanız harika çalışıyor. Teşekkürler!',
        category: 'general',
      },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.message).toContain('başarıyla')
  })

  test('should reject contact submission with invalid email', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: 'Test User',
        email: 'invalid-email-format',
        subject: 'Hata Bildirimi',
        message: 'Geçersiz e-posta formatı testi mesajı.',
        category: 'support',
      },
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('geçerli bir e-posta')
  })

  test('should reject contact submission with short message', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Kısa',
        message: 'Kısa',
        category: 'support',
      },
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('en az 10 karakter')
  })
})
