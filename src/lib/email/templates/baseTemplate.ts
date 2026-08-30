/**
 * Odi.Pet OPOS HTML & Plain-Text E-Mail Template Engine
 * 
 * Positioning: Can Dostunun Yaşam Platformu
 * Slogan: Sevgiyle Bak Sağlıkla Büyüt
 * Brand Color: #9C26AF (Canonical Odi Purple)
 * Typography: Plus Jakarta Sans / system-ui
 * Radius: 24px Container Card
 */

export interface EmailActionButton {
  label: string
  url: string
}

export interface RenderEmailOptions {
  title: string
  contentHtml: string
  contentText?: string
  actionButton?: EmailActionButton
  recipientName?: string
  categoryLabel?: string
  isMarketing?: boolean
  unsubscribeUrl?: string
}

export function renderOdiEmailHtml(options: RenderEmailOptions): string {
  const {
    title,
    contentHtml,
    actionButton,
    recipientName,
    categoryLabel,
    isMarketing = false,
    unsubscribeUrl,
  } = options

  const greeting = recipientName ? `Merhaba ${recipientName},` : 'Merhaba,'
  const badgeLabel = categoryLabel || 'Odi.Pet Bilgilendirme'

  const buttonSection = actionButton
    ? `
      <div style="text-align: center; margin: 32px 0 24px 0;">
        <a href="${actionButton.url}" target="_blank" style="background-color: #9C26AF; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 16px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(156, 38, 175, 0.25); transition: all 0.2s ease;">
          ${actionButton.label}
        </a>
      </div>
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 12px; margin-bottom: 0;">
        Bağlantı çalışmazsa şu adresi tarayıcınıza kopyalayabilirsiniz:<br/>
        <span style="color: #9C26AF; word-break: break-all;">${actionButton.url}</span>
      </p>
    `
    : ''

  const unsubscribeSection =
    isMarketing && unsubscribeUrl
      ? `
      <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #9ca3af;">
        Bu e-postayı Odi.Pet duyurularına abone olduğunuz için alıyorsunuz.<br/>
        <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Abonelikten Ayrıl</a>
      </div>
    `
      : ''

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #fcf8fe; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fcf8fe; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; margin: 0 auto;">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="color: #9C26AF; margin: 0; font-size: 26px; font-weight: 800; tracking-tight: -0.02em;">🐾 Odi.Pet</h1>
              <p style="color: #6b7280; font-size: 13px; font-weight: 600; margin: 4px 0 0 0;">Can Dostunun Yaşam Platformu</p>
              <div style="margin-top: 8px;">
                <span style="background-color: #f3e5f5; color: #7b1fa2; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; display: inline-block;">${badgeLabel}</span>
              </div>
            </td>
          </tr>

          <!-- Main Card Container (24px Radius) -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 24px; padding: 36px 28px; border: 1px solid #e5e7eb; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);">
              <p style="font-size: 16px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 16px;">${greeting}</p>
              
              <div style="font-size: 15px; color: #374151; line-height: 1.6;">
                ${contentHtml}
              </div>

              ${buttonSection}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px; color: #6b7280; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0; font-weight: 600; color: #9C26AF;">"Sevgiyle Bak Sağlıkla Büyüt"</p>
              <p style="margin: 6px 0 0 0; color: #9ca3af;">© 2026 Odi.Pet. Tüm hakları saklıdır.</p>
              ${unsubscribeSection}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderOdiEmailText(options: RenderEmailOptions): string {
  const { title, contentText, contentHtml, actionButton, recipientName } = options

  const greeting = recipientName ? `Merhaba ${recipientName},` : 'Merhaba,'
  
  // Extract text from contentText or stripped HTML fallback
  const rawText = contentText || contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  let textOutput = `Odi.Pet — Can Dostunun Yaşam Platformu\n`
  textOutput += `Sevgiyle Bak Sağlıkla Büyüt\n\n`
  textOutput += `${title}\n`
  textOutput += `----------------------------------------\n\n`
  textOutput += `${greeting}\n\n`
  textOutput += `${rawText}\n\n`

  if (actionButton) {
    textOutput += `${actionButton.label}:\n${actionButton.url}\n\n`
  }

  textOutput += `----------------------------------------\n`
  textOutput += `© 2026 Odi.Pet. Tüm hakları saklıdır.\n`

  return textOutput
}
