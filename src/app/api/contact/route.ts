import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/emailService'
import { EmailCategory, DEPARTMENT_MAP } from '@/lib/email/config'
import { isValidEmail, sanitizeHeader } from '@/lib/email/emailService'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiter per IP for public contact form (max 5 requests per 10 mins)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000 // 10 minutes
  const maxRequests = 5

  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + windowMs })
    return false
  }

  if (entry.count >= maxRequests) {
    return true
  }

  entry.count += 1
  return false
}

const CATEGORY_MAPPING: Record<string, EmailCategory> = {
  general: 'GENERAL_CONTACT',
  hello: 'GENERAL_CONTACT',
  support: 'SUPPORT',
  technical: 'SUPPORT',
  press: 'PRESS',
  media: 'PRESS',
  partnership: 'PARTNERSHIP',
  b2b: 'PARTNERSHIP',
  privacy: 'PRIVACY',
  kvkk: 'PRIVACY',
  legal: 'LEGAL',
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Çok fazla iletişim talebi gönderdiniz. Lütfen 10 dakika sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
    }

    const { name, email, subject, message, category = 'general' } = body

    const cleanName = sanitizeHeader(String(name || ''))
    const cleanEmail = sanitizeHeader(String(email || ''))
    const cleanSubject = sanitizeHeader(String(subject || ''))
    const cleanMessage = String(message || '').trim()

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ error: 'Lütfen geçerli bir isim giriniz.' }, { status: 400 })
    }

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: 'Lütfen geçerli bir e-posta adresi giriniz.' }, { status: 400 })
    }

    if (!cleanSubject || cleanSubject.length < 3) {
      return NextResponse.json({ error: 'Lütfen geçerli bir konu başlığı giriniz.' }, { status: 400 })
    }

    if (!cleanMessage || cleanMessage.length < 10) {
      return NextResponse.json({ error: 'Mesajınız en az 10 karakter olmalıdır.' }, { status: 400 })
    }

    const emailCategory: EmailCategory = CATEGORY_MAPPING[category.toLowerCase()] || 'GENERAL_CONTACT'
    const targetDeptConfig = DEPARTMENT_MAP[emailCategory]

    const emailSubject = `[Web İletişim] ${cleanSubject} — (${cleanName})`

    const htmlContent = `
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-[14px]; color: #374151;"><strong>Gönderen Adı:</strong> ${cleanName}</p>
        <p style="margin: 0 0 8px 0; font-[14px]; color: #374151;"><strong>E-Posta:</strong> <a href="mailto:${cleanEmail}" style="color: #9C26AF;">${cleanEmail}</a></p>
        <p style="margin: 0 0 8px 0; font-[14px]; color: #374151;"><strong>Departman:</strong> ${targetDeptConfig.label} (${targetDeptConfig.email})</p>
        <p style="margin: 0; font-[14px]; color: #374151;"><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
      </div>

      <h3 style="color: #111827; margin-top: 0;">Mesaj İçeriği:</h3>
      <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; white-space: pre-wrap; font-size: 15px; color: #1f2937; line-height: 1.6;">
        ${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    `

    // Dispatch email over central EmailService
    // To: Department Email, Reply-To: User Email
    const result = await sendEmail({
      category: emailCategory,
      to: targetDeptConfig.email,
      replyTo: cleanEmail,
      subject: emailSubject,
      html: htmlContent,
      recipientName: targetDeptConfig.label,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'E-posta gönderimi esnasında bir sorun oluştu. Lütfen daha sonra tekrar deneyiniz.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Mesajınız başarıyla Odi.Pet ekibine iletildi. En kısa sürede dönüş sağlanacaktır.',
    })
  } catch (err) {
    console.error('[API /api/contact Exception]', err)
    return NextResponse.json(
      { error: 'Sunucu tarafında beklenmeyen bir hata oluştu.' },
      { status: 500 }
    )
  }
}
