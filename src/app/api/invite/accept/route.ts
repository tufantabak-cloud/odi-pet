import { NextRequest, NextResponse } from 'next/server'
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import {
  ownershipRpcCode,
  ownershipRpcSucceeded,
} from '@/lib/pets/access'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', requiresAuth: true }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.rpc(
    'accept_pet_caregiver_invite',
    { p_token: token }
  )

  if (error) {
    console.error('[invite/accept] RPC failed', error)
    return NextResponse.json(
      { error: 'Davet kabul edilirken beklenmeyen bir hata oluştu.' },
      { status: 500 }
    )
  }

  if (!ownershipRpcSucceeded(data)) {
    const code = ownershipRpcCode(data)
    const responseByCode: Record<
      string,
      { status: number; error: string }
    > = {
      AUTH_REQUIRED: { status: 401, error: 'Unauthorized' },
      EMAIL_NOT_VERIFIED: {
        status: 403,
        error: 'Davet kabulü için e-posta adresinizi doğrulayın.',
      },
      INVALID_TOKEN: { status: 404, error: 'Geçersiz davet bağlantısı' },
      ALREADY_USED: { status: 409, error: 'Bu davet zaten kullanılmış' },
      ALREADY_MEMBER: { status: 409, error: 'Bu pete zaten erişiminiz var' },
      REVOKED: { status: 410, error: 'Bu davet iptal edilmiş' },
      EXPIRED: { status: 410, error: 'Davet süresi dolmuş' },
      EMAIL_MISMATCH: {
        status: 403,
        error: 'Bu davet farklı bir e-posta adresi için oluşturulmuş.',
      },
      SELF_INVITE: { status: 400, error: 'Kendi kendinizi davet edemezsiniz' },
      OWN_PET: { status: 400, error: 'Kendi petinizin davetini kullanamazsınız' },
      INVALID_ROLE: { status: 400, error: 'Geçersiz davet rolü' },
    }
    const response = responseByCode[code ?? ''] ?? {
      status: 400,
      error: 'Davet kabul edilemedi.',
    }
    return NextResponse.json(
      { error: response.error, code },
      { status: response.status }
    )
  }

  return NextResponse.json({
    success: true,
    pet: data.pet,
    role: data.role,
    rewards: data.rewards,
  })
}

// GET: validate token without accepting (for preview page)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })

  // Davet alıcısı henüz pet üyesi olmadığı için normal pet RLS'i ilişkiyi
  // gizler. Token bearer-secret olarak doğrulandıktan sonra yalnızca önizleme
  // için gereken sınırlı alanları server-side service client ile okuyoruz.
  const supabase = createAdminSupabaseClient()
  const { data: invite } = await supabase
    .from('pet_invites')
    .select('status, expires_at, role, pet_id, pets(name, species, breed, profiles!pets_owner_id_fkey(first_name, last_name))')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ valid: false, error: 'Geçersiz davet' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ valid: false, status: invite.status, error: `Davet durumu: ${invite.status}` })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ valid: false, status: 'expired', error: 'Davet süresi dolmuş' })

  return NextResponse.json({ valid: true, invite })
}

