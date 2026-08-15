import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { sendCaregiverInviteEmail } from '@/lib/email/invite-email'
import {
  hasPetCapability,
  ownershipRpcCode,
  ownershipRpcSucceeded,
} from '@/lib/pets/access'
import { formatSupabaseError } from '@/lib/utils/error-handler'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pet_id, email, role } = await req.json()
  if (!pet_id || !email || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['admin', 'editor', 'viewer'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  // Get pet name for invite message
  const { data: pet } = await supabase.from('pets').select('name').eq('id', pet_id).single()

  const { data, error } = await supabase.rpc(
    'create_pet_caregiver_invite',
    {
      p_pet_id: pet_id,
      p_email: email,
      p_role: role,
    }
  )

  if (error) {
    console.error('[pets/family] create_pet_caregiver_invite RPC error:', error)
    const { message } = formatSupabaseError(error, 'QR kod / Davet üretilemedi.')
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (!ownershipRpcSucceeded(data)) {
    const code = ownershipRpcCode(data)
    if (code === 'PLAN_LIMIT') {
      const limit =
        typeof data === 'object'
        && data !== null
        && 'limit' in data
        && typeof data.limit === 'number'
          ? data.limit
          : 2
      return NextResponse.json(
        {
          error: `Plan limitine ulaşıldı (${limit} üye). Yükseltmek için Pro'ya geçin.`,
        },
        { status: 403 }
      )
    }
    const status = code === 'FORBIDDEN' || code === 'ROLE_ESCALATION'
      ? 403
      : 400
    const errorMsgMap: Record<string, string> = {
      SELF_INVITE: 'Kendi e-posta adresinize davet gönderemezsiniz.',
      ALREADY_MEMBER: 'Bu e-posta adresi zaten ekibin bir üyesi.',
      INVALID_ROLE: 'Geçersiz üye rolü seçildi.',
      EMAIL_REQUIRED: 'Geçerli bir e-posta adresi zorunludur.',
      FORBIDDEN: 'Bu pet için üye davet etme yetkiniz bulunmuyor.',
    }
    return NextResponse.json(
      { error: errorMsgMap[code || ''] || 'Davet oluşturulamadı.', code },
      { status }
    )
  }

  const invite =
    typeof data.invite === 'object' && data.invite !== null
      ? data.invite
      : null

  if (!invite || !('token' in invite) || typeof invite.token !== 'string') {
    return NextResponse.json(
      { error: 'Davet oluşturuldu ancak yanıt doğrulanamadı.' },
      { status: 500 }
    )
  }

  // Inviter profile name
  const inviterName = user.user_metadata?.first_name || user.email || 'Bir kullanıcı'

  // Production'da kanonikal URL kullan; dev'de request host'u kullan
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  const isProduction = process.env.NODE_ENV === 'production'
  let requestOrigin: string
  if (isProduction && siteUrl) {
    requestOrigin = siteUrl
  } else {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    const protocol = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
    requestOrigin = host ? `${protocol}://${host}` : (req.nextUrl.origin || siteUrl || 'http://localhost:3000')
  }

  // E-posta gönderimi (Kayıtlı/kayıtsız kullanıcı kontrolü dahil)
  const emailRes = await sendCaregiverInviteEmail({
    toEmail: email,
    inviterName,
    petName: pet?.name ?? 'Can Dostu',
    role,
    inviteToken: invite.token,
    origin: requestOrigin,
  })

  const inviteLink = emailRes.inviteLink
  const isQrMode = email.startsWith('qr-davet-') || email.endsWith('@odipet.local')

  if (!isQrMode && emailRes.emailSent === false) {
    console.warn('[pets/family] Davet e-postası ulaştırılamadı:', { email, error: emailRes.error })
    return NextResponse.json({
      success: true,
      emailSent: false,
      invite,
      inviteLink,
      isExistingUser: emailRes.isExistingUser,
      emailError: emailRes.error,
      message: `Davet oluşturuldu ancak e-posta ulaştırılamadı (${emailRes.error || 'gönderim hatası'}). Lütfen aşağıdaki bağlantıyı kopyalayarak davet etmek istediğiniz kişiye iletin.`,
    })
  }

  return NextResponse.json({
    success: true,
    emailSent: isQrMode ? false : true,
    invite,
    inviteLink,
    isExistingUser: emailRes.isExistingUser,
    message: isQrMode
      ? 'Barkod / QR Kod başarıyla üretildi!'
      : emailRes.isExistingUser
      ? `${pet?.name ?? 'Can Dostu'}'nun bakım ekibine davet gönderildi. Kullanıcı uygulamaya girdiğinde davet penceresini görecek ve e-posta alacak.`
      : `${email} adresine üye olma ve davet kabul etme e-postası gönderildi.`,
  })
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const petId = req.nextUrl.searchParams.get('pet_id')
  if (!petId) return NextResponse.json({ error: 'pet_id required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const canManageCaregivers = await hasPetCapability(
    supabase,
    petId,
    'can_manage_pet_caregivers'
  )

  const [{ data: members }, { data: invites }, { data: activity }, { data: memberships }] = await Promise.all([
    supabase
      .from('pet_members')
      .select(
        '*, profiles!pet_members_profile_id_fkey(first_name, last_name, id)'
      )
      .eq('pet_id', petId),
    supabase.from('pet_invites').select('*').eq('pet_id', petId).eq('status', 'pending'),
    supabase.from('pet_activity_log').select('*, profiles(first_name, last_name)').eq('pet_id', petId).order('created_at', { ascending: false }).limit(20),
    supabase.from('pet_memberships').select('profile_id, role, status').eq('pet_id', petId).eq('status', 'active'),
  ])

  const membershipMap = new Map<string, string>()
  if (memberships) {
    for (const m of memberships) {
      membershipMap.set(m.profile_id, m.role)
    }
  }

  const currentUserCanonicalRole = membershipMap.get(user.id) ?? null

  const enrichedMembers = (members ?? []).map(m => ({
    ...m,
    canonical_role: membershipMap.get(m.profile_id) ?? (m.role === 'owner' ? 'primary_owner' : m.role),
  }))

  return NextResponse.json({
    members: enrichedMembers,
    invites,
    activity,
    canManageCaregivers,
    currentUserCanonicalRole,
  })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })

  const { member_id, pet_id, invite_id, action } = body
  if (!pet_id) return NextResponse.json({ error: 'pet_id zorunludur.' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  // 1. Bekleyen Daveti İptal Etme (Cancel Invite)
  if (invite_id) {
    const { data: inviteData, error: inviteErr } = await supabase.rpc('revoke_pet_invite', {
      p_invite_id: invite_id,
      p_pet_id: pet_id,
    })

    if (inviteErr) {
      console.warn('[pets/family] revoke_pet_invite RPC failed, attempting direct table update:', inviteErr)
      const { error: directErr } = await supabase
        .from('pet_invites')
        .update({ status: 'revoked' })
        .eq('id', invite_id)
        .eq('pet_id', pet_id)

      if (directErr) {
        console.error('[pets/family] Direct pet_invites update failed:', directErr)
        const { message } = formatSupabaseError(directErr, 'Davet iptal edilirken hata oluştu.')
        return NextResponse.json({ error: message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Davet başarıyla iptal edildi.' })
    }

    if (!ownershipRpcSucceeded(inviteData)) {
      const code = ownershipRpcCode(inviteData)
      const status = code === 'FORBIDDEN' ? 403 : code === 'NOT_FOUND' ? 404 : 400
      const errorMsgMap: Record<string, string> = {
        FORBIDDEN: 'Davet iptal etme yetkiniz bulunmuyor.',
        NOT_FOUND: 'İptal edilecek davet bulunamadı.',
        AUTH_REQUIRED: 'Oturum açmanız gerekiyor.',
      }
      return NextResponse.json(
        { error: errorMsgMap[code || ''] || 'Davet iptal edilemedi.', code },
        { status }
      )
    }

    return NextResponse.json({ success: true, message: 'Davet başarıyla iptal edildi.' })
  }

  // 2. Ekipten Ayrılma / Paylaşımı İptal Etme (Leave Team)
  if (action === 'leave') {
    const { data: leaveData, error: leaveErr } = await supabase.rpc('leave_pet_team', {
      p_pet_id: pet_id,
    })

    if (leaveErr) {
      console.warn('[pets/family] leave_pet_team RPC failed, attempting direct table update:', leaveErr)
      const { error: memErr } = await supabase
        .from('pet_memberships')
        .update({ status: 'revoked', revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('pet_id', pet_id)
        .eq('profile_id', user.id)
        .neq('role', 'primary_owner')

      await supabase
        .from('pet_members')
        .delete()
        .eq('pet_id', pet_id)
        .eq('profile_id', user.id)

      if (memErr) {
        console.error('[pets/family] Fallback leave team failed:', memErr)
        const { message } = formatSupabaseError(leaveErr, 'Ekipten ayrılma işlemi başarısız oldu.')
        return NextResponse.json({ error: message }, { status: 500 })
      }

      return NextResponse.json({ success: true, left: true, message: 'Ekipten ayrıldınız.' })
    }

    if (typeof leaveData === 'object' && leaveData !== null && !(leaveData as any).ok) {
      const code = (leaveData as any).code
      if (code === 'PRIMARY_OWNER_CANNOT_LEAVE') {
        return NextResponse.json(
          { error: 'Birincil sahip ekipten ayrılamaz. Önce sahipliği devretmelisiniz.' },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: 'İşlem reddedildi.', code }, { status: 400 })
    }

    return NextResponse.json({ success: true, left: true, message: 'Ekipten ayrıldınız.' })
  }

  // 3. Üyeyi Çıkarma (Remove Caregiver Member)
  if (!member_id) {
    return NextResponse.json({ error: 'member_id zorunludur.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc(
    'remove_pet_caregiver',
    {
      p_pet_id: pet_id,
      p_legacy_member_id: member_id,
    }
  )
  if (error) {
    console.warn('[pets/family] remove_pet_caregiver RPC failed, attempting direct table delete:', error)
    const { error: delErr } = await supabase
      .from('pet_members')
      .delete()
      .eq('id', member_id)
      .eq('pet_id', pet_id)

    if (delErr) {
      console.error('[pets/family] Direct pet_members delete failed:', delErr)
      const { message } = formatSupabaseError(error)
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (!ownershipRpcSucceeded(data)) {
    const code = ownershipRpcCode(data)
    const status = code === 'FORBIDDEN' || code === 'ROLE_ESCALATION'
      ? 403
      : 400
    return NextResponse.json(
      {
        error: code === 'OWNER_CANNOT_BE_REMOVED'
          ? 'Sahip kaldırılamaz'
          : 'Üye kaldırılamadı',
        code,
      },
      { status }
    )
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const { action, pet_id, profile_id, role, confirmation_text } = body
  if (!pet_id || !profile_id) {
    return NextResponse.json(
      { error: 'pet_id ve profile_id zorunludur.' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  if (action === 'transfer_primary_owner') {
    // 1. Sunucu tarafı metin doğrulaması (pet adı teyidi)
    const { data: pet, error: petErr } = await supabase
      .from('pets')
      .select('name')
      .eq('id', pet_id)
      .single()

    if (petErr || !pet) {
      return NextResponse.json({ error: 'Pet bulunamadı.' }, { status: 404 })
    }

    const expectedName = (pet.name || '').trim().toLowerCase()
    const providedName = (confirmation_text || '').trim().toLowerCase()

    if (!providedName || providedName !== expectedName) {
      return NextResponse.json(
        { error: 'Evcil hayvan adı doğrulaması eşleşmiyor. Lütfen pet adını tam girin.' },
        { status: 400 }
      )
    }

    // 2. Atomik RPC çağrısı
    const { data, error } = await supabase.rpc('transfer_pet_primary_owner', {
      p_pet_id: pet_id,
      p_new_profile_id: profile_id,
    })

    if (error) {
      console.error('[pets/family] Primary owner transfer failed', error)
      return NextResponse.json(
        { error: 'Sahiplik transferi veritabanı seviyesinde başarısız oldu.' },
        { status: 500 }
      )
    }

    if (!ownershipRpcSucceeded(data)) {
      const code = ownershipRpcCode(data)
      const statusMap: Record<string, number> = {
        FORBIDDEN: 403,
        ROLE_ESCALATION: 403,
        ALREADY_PRIMARY: 409,
        NEW_OWNER_NOT_CO_OWNER: 409,
        NOT_FOUND: 404,
        MEMBER_NOT_FOUND: 404,
      }

      const safeCode = code || 'UNKNOWN'
      const status = statusMap[safeCode] ?? 400
      const errorMessages: Record<string, string> = {
        FORBIDDEN: 'Bu işlem için yetkiniz yok.',
        ALREADY_PRIMARY: 'Seçilen kullanıcı zaten birincil sahip.',
        NEW_OWNER_NOT_CO_OWNER: 'Sahiplik yalnızca aktif Ortak Sahip (co_owner) rolüne sahip üyelere devredilebilir.',
        MEMBER_NOT_FOUND: 'Hedef üyelik kaydı bulunamadı.',
      }

      return NextResponse.json(
        { error: errorMessages[safeCode] ?? 'Sahiplik devri gerçekleştirilemedi.', code: safeCode },
        { status }
      )
    }

    return NextResponse.json({ success: true, result: data })
  }

  if (action === 'change_role') {
    if (typeof role !== 'string') {
      return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('change_pet_caregiver_role', {
      p_pet_id: pet_id,
      p_profile_id: profile_id,
      p_role: role,
    })

    if (error) {
      console.error('[pets/family] Role change failed', error)
      return NextResponse.json(
        { error: 'Rol değiştirme işlemi başarısız oldu.' },
        { status: 500 }
      )
    }

    if (!ownershipRpcSucceeded(data)) {
      const code = ownershipRpcCode(data)
      const status = code === 'FORBIDDEN' || code === 'ROLE_ESCALATION' ? 403 : 400
      return NextResponse.json(
        { error: 'Rol değiştirme işlemi reddedildi.', code },
        { status }
      )
    }

    return NextResponse.json({ success: true, result: data })
  }

  return NextResponse.json(
    { error: 'Geçersiz aile yönetimi işlemi.' },
    { status: 400 }
  )
}
