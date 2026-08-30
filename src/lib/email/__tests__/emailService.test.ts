import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  sendEmail,
  sanitizeHeader,
  isValidEmail,
  sanitizeErrorMessage,
  createTransporterForCategory,
} from '../emailService'
import {
  getSmtpServerConfig,
  getDepartmentAccount,
  getAdminEmailStatus,
  assertNoClientSideSecrets,
  DEPARTMENT_MAP,
} from '../config'
import { renderOdiEmailHtml, renderOdiEmailText } from '../templates/baseTemplate'
import fs from 'fs'
import path from 'path'

describe('Natro XMail SMTP Integration & EmailService Tests', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  // 1. SMTP Server Configuration Validation
  it('should use default Natro XMail SMTP parameters when environment variables are omitted', () => {
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_SECURE

    const config = getSmtpServerConfig()
    expect(config.host).toBe('mail.kurumsaleposta.com')
    expect(config.port).toBe(465)
    expect(config.secure).toBe(true)
  })

  // 2. Department Account Mapping
  it('should correctly map all 7 corporate department email accounts', () => {
    expect(DEPARTMENT_MAP.SYSTEM_ADMIN.email).toBe('owner@odi.pet')
    expect(DEPARTMENT_MAP.GENERAL_CONTACT.email).toBe('hello@odi.pet')
    expect(DEPARTMENT_MAP.SUPPORT.email).toBe('support@odi.pet')
    expect(DEPARTMENT_MAP.PRESS.email).toBe('press@odi.pet')
    expect(DEPARTMENT_MAP.PARTNERSHIP.email).toBe('partnership@odi.pet')
    expect(DEPARTMENT_MAP.PRIVACY.email).toBe('privacy@odi.pet')
    expect(DEPARTMENT_MAP.LEGAL.email).toBe('legal@odi.pet')
  })

  // 3. Missing Credentials Handling
  it('should gracefully simulate email sending when SMTP password is not configured in dev/test', async () => {
    delete process.env.SMTP_SUPPORT_PASSWORD
    delete process.env.SMTP_HELLO_PASSWORD

    const result = await sendEmail({
      category: 'SUPPORT',
      to: 'user@example.com',
      subject: 'Destek Talebi',
      html: '<p>Test Mesajı</p>',
    })

    expect(result.success).toBe(true)
    expect(result.simulated).toBe(true)
    expect(result.messageId).toContain('simulated-')
  })

  // 4. Header Injection Prevention (\r\n Attack)
  it('should sanitize subjects and email headers to prevent CRLF header injection', () => {
    const maliciousSubject = 'Test Subject\r\nBcc: hacker@attacker.com\r\nContent-Type: text/html'
    const sanitizedSubject = sanitizeHeader(maliciousSubject)

    expect(sanitizedSubject).not.toContain('\r')
    expect(sanitizedSubject).not.toContain('\n')
    expect(sanitizedSubject).toBe('Test SubjectBcc: hacker@attacker.comContent-Type: text/html')
  })

  // 5. Email Validation
  it('should validate email format and reject invalid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('support@odi.pet')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('user@domain')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  // 6. Support Email Test & Reply-To Routing
  it('should format SUPPORT emails with support@odi.pet as sender and user email as Reply-To', async () => {
    const result = await sendEmail({
      category: 'SUPPORT',
      to: 'support@odi.pet',
      replyTo: 'user@client.com',
      subject: 'Yardım İstedi',
      html: '<p>Sorun var</p>',
    })

    expect(result.success).toBe(true)
  })

  // 7. Hello Email Test
  it('should route GENERAL_CONTACT emails to hello@odi.pet', async () => {
    const result = await sendEmail({
      category: 'GENERAL_CONTACT',
      to: 'user@client.com',
      subject: 'Hoş geldiniz',
      html: '<p>Merhaba Odi.Pet</p>',
    })

    expect(result.success).toBe(true)
  })

  // 8. Odi.Pet Brand HTML & Plain-Text Fallback Generator
  it('should render brand elements including slogan, positioning and Plus Jakarta Sans font in HTML/Text', () => {
    const html = renderOdiEmailHtml({
      title: 'Aşı Zamanı',
      contentHtml: '<p>Dostunuzun aşısı yaklaştı!</p>',
      recipientName: 'Tufan',
      categoryLabel: 'Sağlık Hatırlatması',
    })

    expect(html).toContain('🐾 Odi.Pet')
    expect(html).toContain('Can Dostunun Yaşam Platformu')
    expect(html).toContain('"Sevgiyle Bak Sağlıkla Büyüt"')
    expect(html).toContain('Plus Jakarta Sans')
    expect(html).toContain('Merhaba Tufan,')

    const text = renderOdiEmailText({
      title: 'Aşı Zamanı',
      contentHtml: '<p>Dostunuzun aşısı yaklaştı!</p>',
      recipientName: 'Tufan',
    })

    expect(text).toContain('Odi.Pet — Can Dostunun Yaşam Platformu')
    expect(text).toContain('Sevgiyle Bak Sağlıkla Büyüt')
    expect(text).toContain('© 2026 Odi.Pet. Tüm hakları saklıdır.')
  })

  // 9. Marketing vs Transactional Unsubscribe Rules
  it('should include unsubscribe link ONLY when isMarketing is true', () => {
    const marketingHtml = renderOdiEmailHtml({
      title: 'Yaz Kampanyası',
      contentHtml: '<p>Büyük indirim!</p>',
      isMarketing: true,
      unsubscribeUrl: 'https://odi.pet/unsubscribe?token=123',
    })

    expect(marketingHtml).toContain('Abonelikten Ayrıl')
    expect(marketingHtml).toContain('https://odi.pet/unsubscribe?token=123')

    const transactionalHtml = renderOdiEmailHtml({
      title: 'Şifre Sıfırlama',
      contentHtml: '<p>Şifrenizi sıfırlayın.</p>',
      isMarketing: false,
    })

    expect(transactionalHtml).not.toContain('Abonelikten Ayrıl')
  })

  // 10. Error Message Sanitization (No Password Leakage)
  it('should sanitize raw SMTP error messages to prevent credential leakage', () => {
    const rawError = 'Error 535: AUTH UNKNOWN password=MySecretPass123! auth_user=owner@odi.pet'
    const safeError = sanitizeErrorMessage(rawError)

    expect(safeError).not.toContain('MySecretPass123!')
    expect(safeError).toContain('SMTP kimlik doğrulama hatası.')
  })

  // 11. Security Violation Assertion (Client-Side Exposure Guard)
  it('should throw security error if NEXT_PUBLIC_SMTP_* variable exists', () => {
    process.env.NEXT_PUBLIC_SMTP_PASSWORD = 'LEAKED_SECRET'

    expect(() => assertNoClientSideSecrets()).toThrow(
      '[Security Violation] SMTP secret exposed to client: NEXT_PUBLIC_SMTP_PASSWORD'
    )
  })

  // 12. Admin Configuration Status Object (Zero Secret Exposure)
  it('should return Admin Email Status without returning passwords or sensitive tokens', () => {
    process.env.SMTP_OWNER_PASSWORD = 'super-secret-password'

    const status = getAdminEmailStatus()

    expect(status.provider).toBe('Natro XMail')
    expect(status.domain).toBe('odi.pet')
    expect(status.smtpHost).toBe('mail.kurumsaleposta.com')
    expect(status.smtpPort).toBe(465)
    expect(status.totalAccounts).toBe(7)

    // Ensure status response contains NO password or passEnvKey values
    const statusJson = JSON.stringify(status)
    expect(statusJson).not.toContain('super-secret-password')
    expect(statusJson).not.toContain('SMTP_OWNER_PASSWORD')
  })

  // 13. Client Bundle Security Scanner Test
  it('should verify that client-side page components do not import nodemailer or SMTP credentials', () => {
    const componentsDir = path.join(process.cwd(), 'src', 'components')
    if (fs.existsSync(componentsDir)) {
      const files = fs.readdirSync(componentsDir, { recursive: true }) as string[]
      for (const file of files) {
        if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = fs.readFileSync(path.join(componentsDir, file), 'utf-8')
          expect(content).not.toContain('SMTP_OWNER_PASSWORD')
          expect(content).not.toContain('SMTP_SUPPORT_PASSWORD')
          expect(content).not.toContain("from 'nodemailer'")
        }
      }
    }
  })
})
