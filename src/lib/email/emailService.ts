import nodemailer from 'nodemailer'
import {
  EmailCategory,
  getDepartmentAccount,
  getSmtpServerConfig,
  assertNoClientSideSecrets,
} from './config'
import {
  renderOdiEmailHtml,
  renderOdiEmailText,
  RenderEmailOptions,
  EmailActionButton,
} from './templates/baseTemplate'

export interface SendEmailOptions {
  category?: EmailCategory
  to: string | string[]
  replyTo?: string
  subject: string
  html?: string
  text?: string
  actionButton?: EmailActionButton
  recipientName?: string
  isMarketing?: boolean
  unsubscribeUrl?: string
  headers?: Record<string, string>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  simulated?: boolean
  error?: string
}

/**
 * Sanitize header inputs to prevent CRLF / Header Injection attacks
 */
export function sanitizeHeader(input: string): string {
  if (!input) return ''
  return input.replace(/[\r\n]/g, '').trim()
}

/**
 * Validate e-mail address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const clean = sanitizeHeader(email)
  // Standard RFC 5322 simplified email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(clean)
}

/**
 * Sanitize error message to ensure no credentials/passwords leak in logs or responses
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'Bilinmeyen e-posta hatası.'
  let message = error instanceof Error ? error.message : String(error)

  // Remove potential password strings or authorization tokens
  message = message.replace(/(pass|password|auth|secret|token)[:=]\s*\S+/gi, '$1: ***')
  message = message.replace(/AUTH UNKNOWN|Invalid login|535 5\.7\.8/gi, 'SMTP kimlik doğrulama hatası.')
  return message
}

/**
 * Create a server-side Nodemailer transporter for the given department category
 */
export function createTransporterForCategory(category: EmailCategory = 'GENERAL_CONTACT') {
  assertNoClientSideSecrets()
  const serverConfig = getSmtpServerConfig()
  const account = getDepartmentAccount(category)

  if (!account.isConfigured) {
    return null
  }

  return nodemailer.createTransport({
    host: serverConfig.host,
    port: serverConfig.port,
    secure: serverConfig.secure,
    auth: {
      user: account.user,
      pass: account.password,
    },
    // SSL/TLS options for Natro XMail
    tls: {
      rejectUnauthorized: true,
    },
  })
}

/**
 * SSOT Central Email Service
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    assertNoClientSideSecrets()

    const {
      category = 'GENERAL_CONTACT',
      to,
      replyTo,
      subject,
      html: customHtml,
      text: customText,
      actionButton,
      recipientName,
      isMarketing = false,
      unsubscribeUrl,
      headers: customHeaders,
    } = options

    // 1. Sanitize & validate recipients
    const recipientsArray = Array.isArray(to) ? to : [to]
    const sanitizedRecipients = recipientsArray.map(sanitizeHeader).filter(Boolean)

    if (sanitizedRecipients.length === 0) {
      return { success: false, error: 'Geçersiz veya boş alıcı e-posta adresi.' }
    }

    for (const email of sanitizedRecipients) {
      if (!isValidEmail(email)) {
        return { success: false, error: `Geçersiz alıcı e-posta adresi formatı: ${email}` }
      }
    }

    const sanitizedSubject = sanitizeHeader(subject)
    if (!sanitizedSubject) {
      return { success: false, error: 'E-posta konu başlığı boş olamaz.' }
    }

    const sanitizedReplyTo = replyTo ? sanitizeHeader(replyTo) : undefined
    if (sanitizedReplyTo && !isValidEmail(sanitizedReplyTo)) {
      return { success: false, error: `Geçersiz Reply-To e-posta formatı: ${sanitizedReplyTo}` }
    }

    // 2. Fetch Department Account Config
    const account = getDepartmentAccount(category)

    // 3. Render Template if custom HTML not provided
    const templateOptions: RenderEmailOptions = {
      title: sanitizedSubject,
      contentHtml: customHtml || customText || '',
      contentText: customText,
      actionButton,
      recipientName,
      categoryLabel: account.label,
      isMarketing,
      unsubscribeUrl,
    }

    const finalHtml = customHtml ? renderOdiEmailHtml({ ...templateOptions, contentHtml: customHtml }) : renderOdiEmailHtml(templateOptions)
    const finalText = customText ? renderOdiEmailText({ ...templateOptions, contentText: customText }) : renderOdiEmailText(templateOptions)

    // 4. Check Transporter Configuration
    const transporter = createTransporterForCategory(category)

    // If SMTP credentials not provided (e.g. dev environment without credentials), simulate email send
    if (!transporter) {
      console.warn(`[EmailService Simulation] SMTP credentials missing for ${category} (${account.email}). Subject: "${sanitizedSubject}" -> To:`, sanitizedRecipients)
      return {
        success: true,
        simulated: true,
        messageId: `simulated-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      }
    }

    // 5. Construct Mail Options
    // Note: 'from' MUST always be the official department email for SPF/DMARC compliance.
    const fromString = `"${account.label} (Odi.Pet)" <${account.email}>`

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromString,
      to: sanitizedRecipients.join(', '),
      replyTo: sanitizedReplyTo || account.email,
      subject: sanitizedSubject,
      html: finalHtml,
      text: finalText,
      headers: customHeaders,
    }

    // 6. Send Email via Natro SMTP
    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      messageId: info.messageId,
      simulated: false,
    }
  } catch (err: unknown) {
    const safeError = sanitizeErrorMessage(err)
    console.error('[EmailService Error]', safeError)
    return {
      success: false,
      error: safeError,
    }
  }
}
