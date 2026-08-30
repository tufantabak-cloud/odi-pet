/**
 * Odi.Pet SSOT Corporate Mail Configuration
 * Provider: Natro XMail (mail.kurumsaleposta.com)
 * Domain: odi.pet
 * Webmail: https://mail.kurumsaleposta.com/
 * 
 * SECURITY RULE:
 * - Credentials must NEVER be exposed to the client-side.
 * - No NEXT_PUBLIC_SMTP_* variables allowed.
 */

export type EmailCategory =
  | 'SYSTEM_ADMIN'
  | 'GENERAL_CONTACT'
  | 'SUPPORT'
  | 'PRESS'
  | 'PARTNERSHIP'
  | 'PRIVACY'
  | 'LEGAL'

export interface DepartmentAccountConfig {
  category: EmailCategory
  email: string
  label: string
  userEnvKey: string
  passEnvKey: string
}

export const EMAIL_DOMAIN = 'odi.pet'
export const DEFAULT_SMTP_HOST = 'mail.kurumsaleposta.com'
export const DEFAULT_SMTP_PORT = 465
export const DEFAULT_SMTP_SECURE = true
export const WEBMAIL_URL = 'https://mail.kurumsaleposta.com/'

export const DEPARTMENT_MAP: Record<EmailCategory, DepartmentAccountConfig> = {
  SYSTEM_ADMIN: {
    category: 'SYSTEM_ADMIN',
    email: 'owner@odi.pet',
    label: 'Yönetici & Sistem Operasyonu',
    userEnvKey: 'SMTP_OWNER_USER',
    passEnvKey: 'SMTP_OWNER_PASSWORD',
  },
  GENERAL_CONTACT: {
    category: 'GENERAL_CONTACT',
    email: 'hello@odi.pet',
    label: 'Genel İletişim',
    userEnvKey: 'SMTP_HELLO_USER',
    passEnvKey: 'SMTP_HELLO_PASSWORD',
  },
  SUPPORT: {
    category: 'SUPPORT',
    email: 'support@odi.pet',
    label: 'Teknik Destek & Müşteri Hizmetleri',
    userEnvKey: 'SMTP_SUPPORT_USER',
    passEnvKey: 'SMTP_SUPPORT_PASSWORD',
  },
  PRESS: {
    category: 'PRESS',
    email: 'press@odi.pet',
    label: 'Basın & Medya İletişimi',
    userEnvKey: 'SMTP_PRESS_USER',
    passEnvKey: 'SMTP_PRESS_PASSWORD',
  },
  PARTNERSHIP: {
    category: 'PARTNERSHIP',
    email: 'partnership@odi.pet',
    label: 'İş Ortaklıkları & B2B',
    userEnvKey: 'SMTP_PARTNERSHIP_USER',
    passEnvKey: 'SMTP_PARTNERSHIP_PASSWORD',
  },
  PRIVACY: {
    category: 'PRIVACY',
    email: 'privacy@odi.pet',
    label: 'Gizlilik & KVKK Talepleri',
    userEnvKey: 'SMTP_PRIVACY_USER',
    passEnvKey: 'SMTP_PRIVACY_PASSWORD',
  },
  LEGAL: {
    category: 'LEGAL',
    email: 'legal@odi.pet',
    label: 'Hukuki Bildirimler & Yasal İletişim',
    userEnvKey: 'SMTP_LEGAL_USER',
    passEnvKey: 'SMTP_LEGAL_PASSWORD',
  },
}

export function assertNoClientSideSecrets() {
  const isBrowser = typeof window !== 'undefined' && typeof process?.versions?.node === 'undefined'
  if (isBrowser) {
    throw new Error('[Security Exception] SMTP Configuration cannot be imported or accessed on the client-side!')
  }
  const envKeys = Object.keys(process.env)
  const exposedSecret = envKeys.find((key) => key.startsWith('NEXT_PUBLIC_SMTP_'))
  if (exposedSecret) {
    throw new Error(`[Security Violation] SMTP secret exposed to client: ${exposedSecret}`)
  }
}

export function getSmtpServerConfig() {
  assertNoClientSideSecrets()
  const host = process.env.SMTP_HOST || DEFAULT_SMTP_HOST
  const port = Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT)
  const secure = process.env.SMTP_SECURE !== 'false'

  return { host, port, secure }
}

export function getDepartmentAccount(category: EmailCategory = 'GENERAL_CONTACT') {
  assertNoClientSideSecrets()
  const config = DEPARTMENT_MAP[category] || DEPARTMENT_MAP.GENERAL_CONTACT
  const user = process.env[config.userEnvKey] || config.email
  const password = process.env[config.passEnvKey] || ''

  return {
    category: config.category,
    email: config.email,
    user,
    password,
    label: config.label,
    isConfigured: Boolean(password && password.trim().length > 0),
  }
}

export function getAdminEmailStatus() {
  assertNoClientSideSecrets()
  const serverConfig = getSmtpServerConfig()

  const accounts = Object.values(DEPARTMENT_MAP).map((dept) => {
    const acc = getDepartmentAccount(dept.category)
    return {
      category: dept.category,
      email: dept.email,
      label: dept.label,
      isConfigured: acc.isConfigured,
    }
  })

  const configuredCount = accounts.filter((a) => a.isConfigured).length

  return {
    provider: 'Natro XMail',
    domain: EMAIL_DOMAIN,
    webmail: WEBMAIL_URL,
    smtpHost: serverConfig.host,
    smtpPort: serverConfig.port,
    smtpSecure: serverConfig.secure,
    status: configuredCount > 0 ? 'Connected' : 'Not configured',
    totalAccounts: accounts.length,
    configuredAccounts: configuredCount,
    accounts,
  }
}
