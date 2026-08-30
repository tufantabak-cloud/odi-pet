import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { sendEmail, isValidEmail, sanitizeHeader } from '@/lib/email/emailService'
import { EmailCategory, DEPARTMENT_MAP } from '@/lib/email/config'

export const dynamic = 'force-dynamic'

/**
 * Mask email address for privacy in test reports (e.g. user@example.com -> u***@example.com)
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***'
  const [local, domain] = email.split('@')
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`
  return `${maskedLocal}@${domain}`
}

export async function POST(req: NextRequest) {
  try {
    // Check session or secure service test token
    const testTokenHeader = req.headers.get('x-test-token')
    const isValidToken = Boolean(
      process.env.CRON_SECRET &&
      testTokenHeader &&
      testTokenHeader === process.env.CRON_SECRET
    )

    const user = isValidToken ? null : await getSessionUser()
    if (!isValidToken && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
    }

    const { category = 'SYSTEM_ADMIN', to } = body
    const cleanTo = sanitizeHeader(String(to || ''))

    if (!cleanTo || !isValidEmail(cleanTo)) {
      return NextResponse.json({ error: 'Lütfen geçerli bir test alıcı e-posta adresi giriniz.' }, { status: 400 })
    }

    const emailCategory: EmailCategory = category in DEPARTMENT_MAP ? (category as EmailCategory) : 'SYSTEM_ADMIN'
    const deptConfig = DEPARTMENT_MAP[emailCategory]

    const subject = `ODI.PET SMTP Production Verification`
    const htmlContent = `
      <p style="font-size: 16px; font-weight: 700; color: #9C26AF;">Bu bir Odi.Pet production SMTP doğrulama testidir.</p>
      <p style="font-size: 14px; color: #374151; line-height: 1.6;">
        Bu e-posta, Odi.Pet resmi Natro XMail SMTP altyapısı (<strong>${deptConfig.email}</strong>) üzerinden canlı sunucu doğrulaması amacıyla gönderilmiştir.
      </p>
      <div style="background-color: #f3e5f5; padding: 14px; border-radius: 12px; font-size: 13px; color: #7b1fa2; margin-top: 16px;">
        <strong>Test Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}<br/>
        <strong>Gönderici:</strong> ${deptConfig.email}<br/>
        <strong>Alıcı:</strong> ${maskEmail(cleanTo)}
      </div>
    `

    const result = await sendEmail({
      category: emailCategory,
      to: cleanTo,
      subject,
      html: htmlContent,
      recipientName: 'Test Kullanıcısı',
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'SMTP gönderim hatası.',
          maskedRecipient: maskEmail(cleanTo),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      simulated: result.simulated ?? false,
      messageId: result.messageId,
      maskedRecipient: maskEmail(cleanTo),
      sender: deptConfig.email,
      message: result.simulated
        ? 'SMTP simülasyon modunda tamamlandı (Secret eksik).'
        : 'SMTP authentication ve mesaj gönderimi başarıyla tamamlandı!',
    })
  } catch (err) {
    console.error('[Admin Email Test Exception]', err)
    return NextResponse.json(
      { error: 'Beklenmeyen sunucu hatası.' },
      { status: 500 }
    )
  }
}
