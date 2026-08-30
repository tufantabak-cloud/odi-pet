import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/emailService'

interface SendInviteEmailParams {
  toEmail: string
  inviterName: string
  petName: string
  role: string
  inviteToken: string
  origin?: string
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
  origin,
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
  const isProduction = process.env.NODE_ENV === 'production'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  // Production'da daima kanonikal site URL'sini kullan (QR kodunun mobil cihazdan açılabilmesi için)
  // Dev ortamında origin header'ını kullan (local IP ile çalışabilmesi için)
  const baseUrl = (isProduction && siteUrl) ? siteUrl : (origin || siteUrl || 'http://localhost:3000')
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
  const inviteLink = `${cleanBaseUrl}/invite/${inviteToken}`

  // QR kodu davetleri sentetik e-posta (qr-davet-...@odipet.local) kullandığından e-posta gönderimi gerekmez
  const isQrInvite = toEmail.startsWith('qr-davet-') || toEmail.endsWith('@odipet.local')
  if (isQrInvite) {
    return { success: true, simulated: true, isExistingUser: false, inviteLink, isQr: true, emailSent: false }
  }

  // 2. Şablon Başlık ve Gövdesi
  const subject = isExistingUser
    ? `[Odi.Pet] ${petName}'nin Bakım Ekibine Davet Edildiniz! 🐾`
    : `[Odi.Pet] ${petName}'nin Bakım Ekibine Katılmak İçin Davet Edildiniz! 🐾`

  const recipientGreeting = profile?.first_name ? `Merhaba ${profile.first_name},` : 'Merhaba,'

  const actionText = isExistingUser
    ? `<strong>${inviterName}</strong> seni <strong>${petName}</strong> isimli dostumuzun bakım ekibine (<strong>${roleLabel}</strong>) davet etti!<br/><br/>Uygulamayı açtığında davet kabul penceresini doğrudan görebilir veya aşağıdaki bağlantıdan hemen kabul edebilirsin.`
    : `<strong>${inviterName}</strong> seni Odi üzerinde <strong>${petName}</strong> isimli dostumuzun bakım ekibine (<strong>${roleLabel}</strong>) davet etti!<br/><br/>Aşağıdaki bağlantıdan hemen kaydolup daveti kabul ederek <strong>${petName}</strong>'nin bakım yolculuğuna katılabilirsin.`

  const buttonLabel = isExistingUser ? 'Daveti Kabul Et →' : 'Üye Ol ve Daveti Kabul Et →'

  const htmlContent = `
    <p style="font-size: 16px; font-weight: 700; color: #1f2937; margin-top: 0;">${recipientGreeting}</p>
    <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
      ${actionText}
    </p>
  `

  // 3. Central EmailService vasıtasıyla e-posta gönderimi (Natro XMail SMTP / SUPPORT category)
  const emailRes = await sendEmail({
    category: 'SUPPORT',
    to: toEmail,
    subject,
    html: htmlContent,
    recipientName: profile?.first_name,
    actionButton: {
      label: buttonLabel,
      url: inviteLink,
    },
  })

  if (!emailRes.success) {
    console.error('[Invite Email Failure]', { to: toEmail, error: emailRes.error })
    return {
      success: false,
      emailSent: false,
      isExistingUser,
      inviteLink,
      error: emailRes.error || 'E-posta servisine ulaşılamadı.',
    }
  }

  return {
    success: true,
    emailSent: !emailRes.simulated,
    simulated: emailRes.simulated,
    isExistingUser,
    inviteLink,
    messageId: emailRes.messageId,
  }
}
