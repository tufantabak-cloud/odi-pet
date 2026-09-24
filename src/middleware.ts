import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * VAL-023 Fix — Supabase SSR Auth Middleware
 *
 * Supabase SSR kütüphanesi, oturum token'larını (access_token + refresh_token)
 * HTTP-only cookie olarak saklar. Token'ın süresi dolduğunda yenileme işlemi
 * **yalnızca** bu middleware aracılığıyla gerçekleşebilir; aksi hâlde Server
 * Component'lerdeki `setAll` çağrısı sessizce görmezden gelinir ve oturum
 * "süresi doldu" hatası verir.
 *
 * Bu middleware:
 * 1. Her istekte Supabase session'ını kontrol eder ve gerektiğinde yeniler.
 * 2. Yenilenen cookie'leri hem isteğe (request) hem yanıta (response) yazar.
 * 3. /owner/* ve /admin/* gibi korumalı rotaları guard etmez —
 *    rota koruması layout.tsx içindeki `requireRole` üzerinden kalır.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. İstek nesnesine cookie'leri yaz (sonraki Server Component'ler okuyabilsin)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // 2. Yanıt nesnesini yeniden oluştur (güncellenmiş request ile)
          supabaseResponse = NextResponse.next({
            request,
          })
          // 3. Yanıta da cookie'leri yaz (tarayıcı güncel token'ı alsın)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ÖNEMLI: getUser() çağrısı token yenileme sürecini tetikler.
  // Bu satırı kaldırmak veya başka bir auth çağrısıyla değiştirmek
  // session yenilemenin çalışmamasına neden olur.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aşağıdakileri HARIÇ tutan tüm isteklerde middleware çalışsın:
     * - _next/static  (statik dosyalar)
     * - _next/image   (görsel optimizasyonu)
     * - favicon.ico, sitemap.xml, robots.txt
     * - /brand/** ve /public/** gibi statik varlıklar
     * - Monitoring tüneli (Sentry)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|monitoring|brand/|icons/|sw\\.js|\\.well-known/).*)',
  ],
}
