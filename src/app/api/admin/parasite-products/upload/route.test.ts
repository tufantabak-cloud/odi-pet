import { vi, describe, it, expect } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { POST, DELETE } from './route'

vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return { ...actual, getSessionUser: vi.fn(), requireRole: vi.fn() }
})
vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual<typeof serverSupabaseModule>('@/lib/supabase/server')
  return { ...actual, createServerSupabaseClient: () => actual.createAdminSupabaseClient() }
})

// NOT: Başarılı çok-parçalı (multipart) yükleme yolu jsdom + undici uyumsuzluğu
// nedeniyle bu harness'ta koşulamaz (req.formData() jsdom'da parse edilemez);
// o yol admin panelde gerçek oturumla tarayıcı üzerinden doğrulanmıştır. Burada
// güvenlik kapıları (yetki + path doğrulaması) regresyona karşı test edilir.
describe('Admin Parasite Product Image Upload — security gates', () => {
  const mockUser = (u: any) => vi.mocked(authModule.getSessionUser).mockResolvedValue(u)
  const mockRole = (a: any) => (vi.mocked(authModule.requireRole) as any).mockResolvedValue(a)

  const emptyPost = () =>
    new NextRequest(new Request('http://localhost/api/admin/parasite-products/upload', { method: 'POST', body: new FormData() }))
  const deleteReq = (path: string) =>
    new NextRequest('http://localhost', { method: 'DELETE', body: JSON.stringify({ path }) })

  it('POST 401 when unauthorized', async () => {
    mockUser(null)
    const res = await POST(emptyPost())
    expect(res.status).toBe(401)
  })

  it('POST 403 for non-admin', async () => {
    mockUser({ id: 'u1' })
    mockRole(null)
    const res = await POST(emptyPost())
    expect(res.status).toBe(403)
  })

  it('POST 400 when admin but no valid file', async () => {
    mockUser({ id: 'u1' })
    mockRole({ id: 'u1' })
    const res = await POST(emptyPost())
    expect(res.status).toBe(400)
  })

  it('DELETE 401 when unauthorized', async () => {
    mockUser(null)
    const res = await DELETE(deleteReq('products/x.png'))
    expect(res.status).toBe(401)
  })

  it('DELETE 403 for non-admin', async () => {
    mockUser({ id: 'u1' })
    mockRole(null)
    const res = await DELETE(deleteReq('products/x.png'))
    expect(res.status).toBe(403)
  })

  it('DELETE 400 on path traversal', async () => {
    mockUser({ id: 'u1' })
    mockRole({ id: 'u1' })
    const res = await DELETE(deleteReq('../secret.png'))
    expect(res.status).toBe(400)
  })

  it('DELETE 400 on wrong bucket prefix', async () => {
    mockUser({ id: 'u1' })
    mockRole({ id: 'u1' })
    const res = await DELETE(deleteReq('other/x.png'))
    expect(res.status).toBe(400)
  })
})
