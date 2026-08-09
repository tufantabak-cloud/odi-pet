import { createServerSupabaseClient } from '@/lib/supabase/server'

interface SendInviteEmailParams {
  toEmail: string
  inviterName: string
  petName: string
  role: string
  inviteToken: string
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Admin (Sağlık & Bakım Yönetimi)',
  editor: 'Editör (Günlük Bakım Görevleri)',
  viewer: 'Görüntüleyici (Salt Okunur)',
  co_owner: 'Ortak Sahip (Tam Yetki)',
}

export async function sendCaregiverInviteEmail({
  toEmail,
  inviterName,
  petName,
  role,
  inviteToken,
}: SendInviteEmailParams) {
  const supabase = await createServerSupabaseClient()

  // 1. Alıcı e-postanın kayıtlı kullanıcı olup olmadığını kontrol et
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name')
    .eq('email', toEmail)
    .maybeSingle()

  const isExistingUser = !!profile
  const roleLabel = ROLE_DISPLAY_NAMES[role] ?? role
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteLink = `${baseUrl}/invite/${inviteToken}`

  // 2. Şablon Başlık ve Gövdesi
  const subject = isExistingUser
    ? `[Odi.Pet] ${petName}'nin Bakım Ekibine Davet Edildiniz! 🐾`
    : `[Odi.Pet] ${petName}'nin Bakım Ekibine Katılmak İçin Davet Edildiniz! 🐾`

  const recipientGreeting = profile?.first_name ? `Merhaba ${profile.first_name},` : 'Merhaba,'

  const actionText = isExistingUser
    ? `<strong>${inviterName}</strong> seni <strong>${petName}</strong> isimli dostumuzun bakım ekibine (<strong>${roleLabel}</strong>) davet etti!<br/><br/>Uygulamayı açtığında davet kabul penceresini doğrudan görebilir veya aşağıdaki bağlantıdan hemen kabul edebilirsin.`
    : `<strong>${inviterName}</strong> seni Odi üzerinde <strong>${petName}</strong> isimli dostumuzun bakım ekibine (<strong>${roleLabel}</strong>) davet etti!<br/><br/>Aşağıdaki bağlantıdan hemen kaydolup daveti kabul ederek <strong>${petName}</strong>'nin bakım yolculuğuna katılabilirsin.`

  const buttonLabel = isExistingUser ? 'Daveti Kabul Et →' : 'Üye Ol ve Daveti Kabul Et →'

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background-color: #f5f3ff; border-radius: 20px;">
      <div style="text-align: center; padding: 20px 0 10px 0;">
        <h1 style="color: #7c3aed; margin: 0; font-size: 24px; font-weight: 800;">🐾 Odi</h1>
        <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Evcil Hayvan Yaşam Platformu</p>
      </div>

      <div style="background-color: #ffffff; padding: 28px; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.05);">
        <p style="font-size: 16px; font-weight: 700; color: #1f2937; margin-top: 0;">${recipientGreeting}</p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
          ${actionText}
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3);">
            ${buttonLabel}
          </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">
          Bağlantı çalışmazsa şu adresi tarayıcınıza kopyalayabilirsiniz:<br/>
          <span style="color: #7c3aed; word-break: break-all;">${inviteLink}</span>
        </p>
      </div>

      <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #9ca3af;">
        © 2026 Odi.Pet. Tüm hakları saklıdır.
      </div>
    </div>
  `

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[Email Simulation] No RESEND_API_KEY found. Link:', inviteLink)
    return { success: true, simulated: true, isExistingUser, inviteLink }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Odi.Pet <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html,
      }),
    })

    const resJson = await res.json()
    if (!res.ok) {
      console.warn('[Resend Email Notice]', resJson.message || resJson)
      return { success: true, emailSent: false, isExistingUser, inviteLink }
    }

    return { success: true, emailSent: true, isExistingUser, inviteLink }
  } catch (err) {
    console.error('[Resend Email Exception]', err)
    return { success: true, emailSent: false, isExistingUser, inviteLink }
  }
}
