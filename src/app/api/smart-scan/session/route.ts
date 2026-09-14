import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const sessionInitSchema = z.object({
  sessionId: z.string().uuid('Geçersiz oturum kimliği'),
})

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json()
    const parseResult = sessionInitSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Geçersiz oturum kimliği.' },
        { status: 400 }
      )
    }

    const { sessionId } = parseResult.data

    // Idempotent upsert into public.smart_scan_sessions for authenticated user
    const { error: dbError } = await (supabase as any)
      .from('smart_scan_sessions')
      .upsert(
        {
          id: sessionId,
          user_id: user.id,
          status: 'active',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    if (dbError) {
      console.error('[api/smart-scan/session] Database error on session init:', dbError)
      return NextResponse.json(
        { error: 'Tarama oturumu başlatılamadı.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId,
    })
  } catch (err) {
    console.error('[api/smart-scan/session] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Sistem hatası oluştu.' },
      { status: 500 }
    )
  }
}
