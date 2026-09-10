import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const commitRequestSchema = z.object({
  sessionId: z.string().uuid('Geçersiz oturum kimliği'),
  idempotencyKey: z.string().min(8, 'Geçersiz idempotency anahtarı'),
  petPayload: z.object({
    name: z.string().min(1, 'Hayvan adı zorunludur'),
    species: z.enum(['cat', 'dog'], {
      message: 'Tür yalnızca kedi (cat) veya köpek (dog) olabilir',
    }),
    breed: z.string().min(1, 'Irk bilgisi zorunludur'),
    gender: z.enum(['male', 'female']).optional().nullable(),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    color: z.string().optional().nullable(),
    microchip_no: z.string().optional().nullable(),
    passport_no: z.string().optional().nullable(),
    avatar_url: z.string().optional().nullable(),
    cover_url: z.string().optional().nullable(),
    lifestyle: z.string().optional().nullable(),
    size: z.string().optional().nullable(),
    is_neutered: z.boolean().optional().nullable(),
  }),
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

    // 2. Parse and validate body
    const body = await req.json()
    const parseResult = commitRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Geçersiz evcil hayvan bilgileri.',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { sessionId, idempotencyKey, petPayload } = parseResult.data

    // 3. Try primary atomic & idempotent Smart Scan RPC
    const rpcResult = await (supabase as any).rpc('create_pet_from_smart_scan', {
      p_session_id: sessionId,
      p_idempotency_key: idempotencyKey,
      p_pet_payload: petPayload,
    })

    if (!rpcResult.error && rpcResult.data?.success) {
      return NextResponse.json({
        success: true,
        petId: rpcResult.data.pet_id,
        idempotentReplay: Boolean(rpcResult.data.idempotent_replay),
        sessionId,
      })
    }

    // 4. Fail-closed safety: Never execute unmanaged legacy pet creation fallback
    const isRpcMissing = rpcResult.error?.code === 'PGRST202'
      || rpcResult.error?.message?.includes('create_pet_from_smart_scan')

    if (isRpcMissing) {
      console.warn('[api/smart-scan/commit] Canonical RPC create_pet_from_smart_scan is missing on DB. Failing closed.')
      return NextResponse.json(
        {
          error: 'Sistem güncellemesi devam ediyor. Lütfen kaydınızı manuel form ile tamamlayınız.',
          fallbackToManual: true,
        },
        { status: 503 }
      )
    }

    // 5. Entitlement limit exceeded check
    if (rpcResult.error?.message?.includes('ENTITLEMENT_LIMIT_EXCEEDED') || rpcResult.error?.code === 'P0003') {
      return NextResponse.json(
        {
          error: 'Akıllı Pasaport Tarama kullanım hakkınız doldu. Bilgileri manuel girerek kaydı tamamlayabilirsiniz.',
          fallbackToManual: true,
          limitReached: true,
        },
        { status: 403 }
      )
    }

    // Unexpected DB error
    console.error('[api/smart-scan/commit] Database error:', rpcResult.error)
    return NextResponse.json(
      {
        error: 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.',
      },
      { status: 500 }
    )
  } catch (err) {
    console.error('[api/smart-scan/commit] Unexpected error:', err)
    return NextResponse.json(
      {
        error: 'Sistemde beklenmeyen bir hata oluştu.',
      },
      { status: 500 }
    )
  }
}
