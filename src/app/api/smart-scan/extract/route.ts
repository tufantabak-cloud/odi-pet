import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { reserveVisionCall } from '@/lib/smart-scan/cost-guard'
import { extractPassportPage, PassportPageType } from '@/lib/smart-scan/vision-gateway'

export const maxDuration = 60

const extractRequestSchema = z.object({
  sessionId: z.string().uuid('Geçersiz oturum kimliği'),
  pageType: z.enum(['cover', 'page_4', 'page_5', 'page_6', 'page_7'] as const),
  imageBase64: z.string().min(20, 'Görsel verisi eksik veya çok kısa'),
  mimeType: z.string().optional().default('image/jpeg'),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Bu işlemi gerçekleştirmek için giriş yapmalısınız.' },
        { status: 401 }
      )
    }

    // 2. Parse & validate request body
    const body = await req.json()
    const parseResult = extractRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Geçersiz istek parametreleri.',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { sessionId, pageType, imageBase64, mimeType } = parseResult.data

    // 3. Atomically reserve Vision budget BEFORE sending HTTP request to AI provider
    const reservation = await reserveVisionCall({
      userId: user.id,
      sessionId,
    })

    if (!reservation.allowed) {
      // Invariant: Friendly Turkish error without leaking internal technical counters
      return NextResponse.json(
        {
          error: 'Belgenizi otomatik okuyamadık. Bilgileri manuel girerek kaydı tamamlayabilirsiniz.',
          limitReached: true,
          fallbackToManual: true,
        },
        { status: 429 }
      )
    }

    // 4. Invoke strictly pinned Gemini 3.8 Flash Vision Model (with max 1 transient retry)
    const isTransient = (err: any): boolean => {
      const status = err?.status || err?.code || err?.statusCode
      if (status === 503 || status === 502 || status === 504 || status === 429) return true
      const msg = String(err?.message || '').toLowerCase()
      return (
        msg.includes('503') ||
        msg.includes('unavailable') ||
        msg.includes('high demand') ||
        msg.includes('etimedout') ||
        msg.includes('econnreset') ||
        msg.includes('fetch failed')
      )
    }

    try {
      let visionResult
      try {
        visionResult = await extractPassportPage({
          pageType: pageType as PassportPageType,
          imageBase64,
          mimeType,
        })
      } catch (firstErr) {
        if (isTransient(firstErr)) {
          console.warn('[api/smart-scan/extract] Transient AI failure encountered, retrying once:', firstErr)
          await new Promise(resolve => setTimeout(resolve, 500))
          visionResult = await extractPassportPage({
            pageType: pageType as PassportPageType,
            imageBase64,
            mimeType,
          })
        } else {
          throw firstErr
        }
      }

      return NextResponse.json({
        success: true,
        pageType,
        data: visionResult.data,
        confidence: visionResult.confidence,
        reservationId: reservation.reservationId,
      })
    } catch (visionError) {
      console.error('[api/smart-scan/extract] AI provider failure:', visionError)
      // Reservation is NOT refunded (Financial invariant)
      return NextResponse.json(
        {
          error: 'Belgenizi otomatik okuyamadık. Bilgileri manuel girerek kaydı tamamlayabilirsiniz.',
          fallbackToManual: true,
        },
        { status: 502 }
      )
    }
  } catch (err) {
    console.error('[api/smart-scan/extract] Unexpected error:', err)
    return NextResponse.json(
      {
        error: 'Sistemde beklenmeyen bir durum oluştu. Lütfen manuel form ile devam ediniz.',
        fallbackToManual: true,
      },
      { status: 500 }
    )
  }
}
